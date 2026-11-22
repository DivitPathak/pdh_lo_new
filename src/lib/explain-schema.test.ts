import { describe, expect, it } from "vitest";
import { MAX_FILE_CHARS, MAX_FILES, MAX_TOTAL_CHARS, explainInput } from "./explain-schema";

describe("explainInput schema", () => {
  it("accepts valid PDF and image payloads", () => {
    const res = explainInput.safeParse({
      language: "en",
      docType: "rent",
      files: [
        { mime: "image/jpeg", dataUrl: "data:image/jpeg;base64,/9j/4AAQ" },
        { mime: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0=" },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("rejects empty files array and empty base64 payloads", () => {
    expect(explainInput.safeParse({ language: "en", docType: "auto", files: [] }).success).toBe(
      false,
    );

    expect(
      explainInput.safeParse({
        language: "en",
        docType: "rent",
        files: [{ mime: "application/pdf", dataUrl: "data:application/pdf;base64," }],
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported mime types and malformed data URLs", () => {
    expect(
      explainInput.safeParse({
        language: "en",
        docType: "insurance",
        files: [{ mime: "image/jpeg", dataUrl: "https://example.com/file.jpg" }],
      }).success,
    ).toBe(false);

    expect(
      explainInput.safeParse({
        language: "en",
        docType: "loan",
        files: [{ mime: "text/plain", dataUrl: "data:text/plain;base64,SGVsbG8=" }],
      }).success,
    ).toBe(false);
  });

  it("enforces MAX_FILE_CHARS boundary for large documents and MAX_FILES limit", () => {
    const prefix = "data:application/pdf;base64,";
    // 10 MB PDF base64 length (~13,981,016 chars) fits inside MAX_FILE_CHARS (14,000,000)
    const tenMbBase64Len = Math.ceil((10 * 1024 * 1024) / 3) * 4;
    const largeValid = `${prefix}${"A".repeat(tenMbBase64Len)}`;
    expect(largeValid.length).toBeLessThanOrEqual(MAX_FILE_CHARS);
    expect(
      explainInput.safeParse({
        language: "en",
        docType: "loan",
        files: [{ mime: "application/pdf", dataUrl: largeValid }],
      }).success,
    ).toBe(true);

    const oversized = `${prefix}${"A".repeat(MAX_FILE_CHARS - prefix.length + 1)}`;
    expect(
      explainInput.safeParse({
        language: "en",
        docType: "loan",
        files: [{ mime: "application/pdf", dataUrl: oversized }],
      }).success,
    ).toBe(false);

    const tooMany = Array.from({ length: MAX_FILES + 1 }, () => ({
      mime: "image/png" as const,
      dataUrl: "data:image/png;base64,iVBOR",
    }));
    expect(
      explainInput.safeParse({ language: "hi", docType: "loan", files: tooMany }).success,
    ).toBe(false);

    expect(
      explainInput.safeParse({
        language: "en",
        docType: "loan",
        files: [
          { mime: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0=" },
          { mime: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0=" },
        ],
      }).success,
    ).toBe(false);

    const imgPrefix = "data:image/jpeg;base64,";
    const chunk = `${imgPrefix}${"A".repeat(Math.ceil(MAX_TOTAL_CHARS / 2))}`;
    expect(chunk.length).toBeLessThanOrEqual(MAX_FILE_CHARS);
    expect(
      explainInput.safeParse({
        language: "en",
        docType: "rent",
        files: [
          { mime: "image/jpeg", dataUrl: chunk },
          { mime: "image/jpeg", dataUrl: chunk },
        ],
      }).success,
    ).toBe(false);
  });
});
