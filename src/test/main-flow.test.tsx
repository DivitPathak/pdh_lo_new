import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { copy } from "@/lib/copy";
import type { ExplainResult } from "@/lib/explain-schema";

const mockExplainFn = vi.fn<() => Promise<ExplainResult>>();

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: () => vi.fn(),
    }),
  }),
  useServerFn: () => mockExplainFn,
}));

import { Route } from "@/routes/index";

const IndexPage = Route.options.component!;

function renderApp() {
  return render(
    <>
      <IndexPage />
      <Toaster richColors position="top-center" />
    </>,
  );
}

describe("Main Agreement Analyzer user flow (including mobile viewport)", () => {
  beforeEach(() => {
    mockExplainFn.mockReset();
    document.documentElement.lang = "en";
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 812,
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("completes mobile upload -> loading -> result -> reset flow and syncs html lang", async () => {
    let resolveServer!: (value: ExplainResult) => void;
    mockExplainFn.mockImplementationOnce(
      () =>
        new Promise<ExplainResult>((resolve) => {
          resolveServer = resolve;
        }),
    );

    const { container } = renderApp();

    // Mobile camera input & choose files button are both accessible
    const cameraInput = container.querySelector(
      'input[type="file"][capture="environment"]',
    ) as HTMLInputElement;
    expect(cameraInput).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.en.camera })).toBeInTheDocument();

    // Upload a valid PDF
    const fileInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    const pdf = new File(["%PDF-1.4\nRent Agreement"], "rent.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdf] } });

    await waitFor(() => expect(screen.getByText("PDF")).toBeInTheDocument());

    // Submit and verify loading state
    fireEvent.click(screen.getByRole("button", { name: copy.en.explain }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: copy.en.reading[0]! })).toBeDisabled(),
    );

    // Resolve with multiple risky clauses
    resolveServer({
      ok: true,
      maskedCount: 1,
      analysis: {
        readable: true,
        unreadable_reason: "",
        doc_type: "rent",
        title: "11-month rent agreement",
        verdict: "red",
        verdict_reason: "Check the lock-in penalty before signing.",
        summary: "Rent ₹22,000 per month for 11 months.",
        key_facts: [{ label: "Rent", value: "₹22,000" }],
        warnings: [
          {
            level: "red",
            title: "6-month lock-in forfeiture",
            explanation: "You lose full deposit if leaving early.",
            clause: "Clause 8",
          },
        ],
        questions: ["Can we reduce the lock-in period to 3 months?"],
        masked_types: ["Name"],
      },
    });

    await waitFor(() => expect(screen.getByText("11-month rent agreement")).toBeInTheDocument());
    expect(screen.getByText("6-month lock-in forfeiture")).toBeInTheDocument();

    // Header language toggle stays locked on results to avoid mixed-language UI
    const hindiRadio = screen.getByRole("radio", { name: "हिन्दी" });
    expect(hindiRadio).toBeDisabled();

    // Start over returns cleanly to upload view and unlocks Hindi toggle
    fireEvent.click(screen.getByRole("button", { name: copy.en.startOver }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: copy.en.explain })).toBeDisabled(),
    );

    fireEvent.click(screen.getAllByRole("radio", { name: "हिन्दी" })[0]!);
    expect(document.documentElement.lang).toBe("hi");
    expect(screen.getByText(copy.hi.heroTitle)).toBeInTheDocument();
  });

  it("shows localized error toasts on API failure, empty response, malformed response, and network rejection", async () => {
    const { container } = renderApp();
    const fileInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    const pdf = new File(["%PDF-1.4\nLoan"], "loan.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdf] } });
    await waitFor(() => expect(screen.getByText("PDF")).toBeInTheDocument());

    const submit = () => fireEvent.click(screen.getByRole("button", { name: copy.en.explain }));

    mockExplainFn.mockResolvedValueOnce({ ok: false, error: "busy" });
    submit();
    expect(await screen.findByText(copy.en.errors["busy"]!)).toBeInTheDocument();

    mockExplainFn.mockResolvedValueOnce({ ok: false, error: "empty" });
    submit();
    expect(await screen.findByText(copy.en.errors["empty"]!)).toBeInTheDocument();

    mockExplainFn.mockResolvedValueOnce({ ok: false, error: "invalid" });
    submit();
    expect(await screen.findByText(copy.en.errors["invalid"]!)).toBeInTheDocument();

    mockExplainFn.mockRejectedValueOnce(new Error("Network down"));
    submit();
    expect(await screen.findByText(copy.en.errors["failed"]!)).toBeInTheDocument();

    // Button recovers after error so user can retry without losing uploaded files
    await waitFor(() =>
      expect(screen.getByRole("button", { name: copy.en.explain })).toBeEnabled(),
    );
  });
});
