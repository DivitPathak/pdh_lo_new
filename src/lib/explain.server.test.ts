import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();
const googleGenAIConstructorMock = vi.fn();

vi.mock("@google/genai", async () => {
  const actual = await vi.importActual<typeof import("@google/genai")>("@google/genai");
  return {
    ...actual,
    GoogleGenAI: class MockGoogleGenAI {
      models = { generateContent: generateContentMock };
      constructor(opts: unknown) {
        googleGenAIConstructorMock(opts);
      }
    },
  };
});

import { explainDocument } from "./explain.server";

const PDF_INPUT = {
  language: "en" as const,
  docType: "rent" as const,
  files: [
    { mime: "application/pdf" as const, dataUrl: "data:application/pdf;base64,JVBERi0xLjQK" },
  ],
};

const MULTIPLE_RISKS_ANALYSIS = {
  readable: true,
  unreadable_reason: "",
  doc_type: "rent" as const,
  title: "11-month rent agreement",
  verdict: "red" as const,
  verdict_reason: "Two serious terms can cost you your deposit.",
  summary: "Monthly rent is ₹25,000 for 11 months.",
  key_facts: [
    { label: "Rent", value: "₹25,000/month" },
    { label: "Deposit", value: "₹2,50,000" },
  ],
  warnings: [
    {
      level: "red" as const,
      title: "Non-refundable deposit deduction",
      explanation: "Landlord deducts 2 months rent on exit. Contact 9876543210.",
      clause: "Clause 7",
    },
    {
      level: "red" as const,
      title: "Immediate eviction without notice",
      explanation: "Owner can ask you to leave in 48 hours.",
      clause: "Clause 11",
    },
    {
      level: "amber" as const,
      title: "Annual rent hike not capped",
      explanation: "Increase percentage is left blank.",
      clause: "Clause 4",
    },
    {
      level: "green" as const,
      title: "Structural repairs covered",
      explanation: "Major plumbing and roof repairs are paid by owner.",
      clause: "Clause 9",
    },
  ],
  questions: ["Can we cap the annual rent hike at 5%?", "Will the full deposit be refunded?"],
  masked_types: ["Phone"],
};

const NO_RISK_ANALYSIS = {
  readable: true,
  unreadable_reason: "",
  doc_type: "insurance" as const,
  title: "Standard health insurance policy",
  verdict: "green" as const,
  verdict_reason: "All standard protections and free-look terms are fair.",
  summary: "Covers hospitalization up to ₹10,00,000 for ₹14,500 per year.",
  key_facts: [{ label: "Sum insured", value: "₹10,00,000" }],
  warnings: [
    {
      level: "green" as const,
      title: "30-day free-look period",
      explanation: "You can cancel within 30 days for a full refund.",
      clause: "Section 2",
    },
    {
      level: "green" as const,
      title: "No room-rent cap",
      explanation: "Any standard single room is covered without sub-limits.",
      clause: "Section 4",
    },
  ],
  questions: ["How do I file a cashless claim?"],
  masked_types: [],
};

describe("explainDocument server helper", () => {
  const originalKey = process.env["GEMINI_API_KEY"];

  beforeEach(() => {
    generateContentMock.mockReset();
    googleGenAIConstructorMock.mockReset();
    process.env["GEMINI_API_KEY"] = "test-key-1";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env["GEMINI_API_KEY"];
    else process.env["GEMINI_API_KEY"] = originalKey;
  });

  it("handles valid PDF upload, caches client, and scrubs PII in multiple risky clauses", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify(MULTIPLE_RISKS_ANALYSIS),
      candidates: [{ finishReason: "STOP" }],
    });

    const first = await explainDocument(PDF_INPUT);
    const second = await explainDocument(PDF_INPUT);

    expect(googleGenAIConstructorMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-4-hydrogen",
        contents: {
          parts: [
            expect.objectContaining({ text: expect.stringContaining("rent document") }),
            { inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQK" } },
          ],
        },
      }),
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok) {
      expect(first.analysis.verdict).toBe("red");
      expect(first.analysis.warnings).toHaveLength(4);
      expect(first.maskedCount).toBe(1);
      expect(first.analysis.warnings[0]?.explanation).toBe(
        "Landlord deducts 2 months rent on exit. Contact [Phone].",
      );
    }
  });

  it("handles PDF with no extractable text (readable=false)", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        readable: false,
        unreadable_reason: "Scanned PDF pages have no readable text; contact 9876543210.",
        doc_type: "other",
        title: "",
        verdict: "amber",
        verdict_reason: "",
        summary: "",
        key_facts: [],
        warnings: [],
        questions: [],
        masked_types: [],
      }),
      candidates: [{ finishReason: "STOP" }],
    });

    const res = await explainDocument(PDF_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.analysis.readable).toBe(false);
      expect(res.analysis.unreadable_reason).toContain("[Phone]");
    }
  });

  it("handles large PDF payload within supported limits", async () => {
    const largeBase64 = "A".repeat(1_000_000);
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify(NO_RISK_ANALYSIS),
      candidates: [{ finishReason: "STOP" }],
    });

    const res = await explainDocument({
      language: "en",
      docType: "insurance",
      files: [{ mime: "application/pdf", dataUrl: `data:application/pdf;base64,${largeBase64}` }],
    });
    expect(res.ok).toBe(true);
    const call = generateContentMock.mock.calls[0]?.[0] as {
      contents: { parts: Array<{ inlineData?: { data: string } }> };
    };
    expect(call.contents.parts[1]?.inlineData?.data).toBe(largeBase64);
  });

  it("returns green verdict when no risky clauses are found", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify(NO_RISK_ANALYSIS),
      candidates: [{ finishReason: "STOP" }],
    });

    const res = await explainDocument(PDF_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.analysis.verdict).toBe("green");
      expect(res.analysis.warnings.every((w) => w.level === "green")).toBe(true);
    }
  });

  it("returns empty when AI response text is blank or missing", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: "   ",
      candidates: [{ finishReason: "STOP" }],
    });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "empty" });

    generateContentMock.mockResolvedValueOnce({
      text: undefined,
      candidates: [{ finishReason: "STOP" }],
    });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "empty" });
  });

  it("returns invalid for malformed JSON or incomplete schema responses", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: "{broken-json",
      candidates: [{ finishReason: "STOP" }],
    });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "invalid" });

    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({ readable: true, title: "Incomplete" }),
      candidates: [{ finishReason: "STOP" }],
    });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "invalid" });
  });

  it("maps missing key, safety refusals, and API errors cleanly", async () => {
    delete process.env["GEMINI_API_KEY"];
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "unavailable" });
    expect(generateContentMock).not.toHaveBeenCalled();

    process.env["GEMINI_API_KEY"] = "test-key-1";

    generateContentMock.mockResolvedValueOnce({
      text: "",
      candidates: [{ finishReason: "SAFETY" }],
    });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "refused" });

    generateContentMock.mockRejectedValueOnce({ status: 429 });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "busy" });

    generateContentMock.mockRejectedValueOnce({ status: 402 });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "credits" });

    generateContentMock.mockRejectedValueOnce({ status: 400 });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "rejected" });

    generateContentMock.mockRejectedValueOnce({ status: 403 });
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "unavailable" });

    generateContentMock.mockRejectedValueOnce(new Error("Upstream 503"));
    expect(await explainDocument(PDF_INPUT)).toEqual({ ok: false, error: "failed" });
  });

  it("retries once on transient 503 errors and succeeds if retry resolves", async () => {
    generateContentMock.mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce({
      text: JSON.stringify(NO_RISK_ANALYSIS),
      candidates: [{ finishReason: "STOP" }],
    });

    const res = await explainDocument(PDF_INPUT);
    expect(res.ok).toBe(true);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
