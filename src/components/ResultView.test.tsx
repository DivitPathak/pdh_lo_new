import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultView } from "./ResultView";
import { copy } from "@/lib/copy";
import type { Analysis } from "@/lib/explain-schema";

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe("ResultView", () => {
  afterEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
    vi.restoreAllMocks();
  });

  it("renders unreadable PDF state and lets the user try again", () => {
    const onReset = vi.fn();
    const unreadable: Analysis = {
      readable: false,
      unreadable_reason: "No extractable text found; sent by [Name].",
      doc_type: "other",
      title: "",
      verdict: "amber",
      verdict_reason: "",
      summary: "",
      key_facts: [],
      warnings: [],
      questions: [],
      masked_types: [],
    };

    render(<ResultView t={copy.en} a={unreadable} maskedCount={0} onReset={onReset} />);

    expect(screen.getByText(copy.en.unreadable)).toBeInTheDocument();
    expect(screen.getByText("Name")).toHaveClass("masked-chip");

    fireEvent.click(screen.getByRole("button", { name: copy.en.tryAgain }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("renders multiple risky clauses, masked chips, and handles clipboard copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const multipleRisks: Analysis = {
      readable: true,
      unreadable_reason: "",
      doc_type: "loan",
      title: "Personal loan from [Name]",
      verdict: "red",
      verdict_reason: "Two severe penalties were found.",
      summary: "Loan of ₹5,00,000 for 36 months.",
      key_facts: [{ label: "Loan amount", value: "₹5,00,000" }],
      warnings: [
        {
          level: "red",
          title: "High foreclosure charge",
          explanation: "5% penalty on early repayment.",
          clause: "Clause 12",
        },
        {
          level: "red",
          title: "Blank auto-debit mandate",
          explanation: "Allows debits beyond EMI.",
          clause: "Clause 15",
        },
        {
          level: "amber",
          title: "Floating interest reset",
          explanation: "Bank may revise rate quarterly.",
          clause: "",
        },
      ],
      questions: ["Can you waive the foreclosure charge?", "What is the interest rate cap?"],
      masked_types: ["Name", "PAN"],
    };

    render(<ResultView t={copy.en} a={multipleRisks} maskedCount={2} onReset={vi.fn()} />);

    expect(screen.getByText(copy.en.verdict.red)).toBeInTheDocument();
    expect(screen.getByText(`2 · ${copy.en.legend.red}`)).toBeInTheDocument();
    expect(screen.getByText(`1 · ${copy.en.legend.amber}`)).toBeInTheDocument();
    expect(screen.getByText(`0 · ${copy.en.legend.green}`)).toBeInTheDocument();
    expect(screen.getByText("High foreclosure charge")).toBeInTheDocument();
    expect(screen.getByText("Blank auto-debit mandate")).toBeInTheDocument();
    expect(screen.getByText("PAN")).toHaveClass("masked-chip");

    fireEvent.click(screen.getByRole("button", { name: copy.en.copyQs }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(
      "1. Can you waive the foreclosure charge?\n2. What is the interest rate cap?",
    );
    expect(toastSuccess).toHaveBeenCalledWith(copy.en.copied);

    writeText.mockRejectedValueOnce(new Error("Clipboard blocked"));
    fireEvent.click(screen.getByRole("button", { name: copy.en.copyQs }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(copy.en.errors["failed"]));
  });

  it("renders green verdict cleanly when no risky clauses are found", () => {
    const safeDoc: Analysis = {
      readable: true,
      unreadable_reason: "",
      doc_type: "rent",
      title: "Standard 11-month rent agreement",
      verdict: "green",
      verdict_reason: "Terms follow standard fair-rent practices.",
      summary: "Rent ₹18,000/month with 2-month deposit and 1-month notice.",
      key_facts: [{ label: "Notice period", value: "1 month" }],
      warnings: [
        {
          level: "green",
          title: "Equal 1-month notice period",
          explanation: "Both landlord and tenant give 30 days notice.",
          clause: "Clause 6",
        },
      ],
      questions: ["Where should monthly rent receipts be sent?"],
      masked_types: [],
    };

    render(<ResultView t={copy.en} a={safeDoc} maskedCount={0} onReset={vi.fn()} />);

    expect(screen.getByText(copy.en.verdict.green)).toBeInTheDocument();
    expect(screen.getByText(`0 · ${copy.en.legend.red}`)).toBeInTheDocument();
    expect(screen.getByText(`0 · ${copy.en.legend.amber}`)).toBeInTheDocument();
    expect(screen.getByText(`1 · ${copy.en.legend.green}`)).toBeInTheDocument();
  });
});
