import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadPanel } from "./UploadPanel";
import { copy } from "@/lib/copy";
import type { PreparedFile } from "@/lib/file-prep";

function makePrepared(id: string, mime: PreparedFile["mime"] = "application/pdf"): PreparedFile {
  return {
    id,
    mime,
    dataUrl: `data:${mime};base64,JVBERi0=`,
    preview: mime === "application/pdf" ? null : `data:${mime};base64,AAAA`,
    label: mime === "application/pdf" ? "PDF" : "Photo",
  };
}

describe("UploadPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("handles valid PDF file selection and forwards prepared files", async () => {
    const onFiles = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <UploadPanel
        t={copy.en}
        lang="en"
        onLang={vi.fn()}
        files={[]}
        onFiles={onFiles}
        docType="auto"
        onDocType={vi.fn()}
        loading={false}
        onSubmit={vi.fn()}
        onError={onError}
      />,
    );

    const submit = screen.getByRole("button", { name: copy.en.explain });
    expect(submit).toBeDisabled();

    const fileInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    const pdf = new File(["%PDF-1.4"], "lease.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdf] } });

    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
    const prepared = onFiles.mock.calls[0]?.[0] as PreparedFile[];
    expect(prepared).toHaveLength(1);
    expect(prepared[0]?.mime).toBe("application/pdf");
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports errors for invalid formats, empty documents, and exceeding MAX_FILES", async () => {
    const onError = vi.fn();
    const onFiles = vi.fn();
    const { container, rerender } = render(
      <UploadPanel
        t={copy.en}
        lang="en"
        onLang={vi.fn()}
        files={[]}
        onFiles={onFiles}
        docType="auto"
        onDocType={vi.fn()}
        loading={false}
        onSubmit={vi.fn()}
        onError={onError}
      />,
    );

    const fileInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: { files: [new File(["hi"], "notes.txt", { type: "text/plain" })] },
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith("type"));

    fireEvent.change(fileInput, {
      target: { files: [new File([], "empty.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith("empty-file"));

    const existing = [1, 2, 3, 4, 5].map((n) => makePrepared(`f-${n}`, "image/jpeg"));
    rerender(
      <UploadPanel
        t={copy.en}
        lang="en"
        onLang={vi.fn()}
        files={existing}
        onFiles={onFiles}
        docType="auto"
        onDocType={vi.fn()}
        loading={false}
        onSubmit={vi.fn()}
        onError={onError}
      />,
    );

    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "extra.pdf", { type: "application/pdf" })] },
    });
    expect(onError).toHaveBeenCalledWith("max");
    expect(onFiles).not.toHaveBeenCalled();

    rerender(
      <UploadPanel
        t={copy.en}
        lang="en"
        onLang={vi.fn()}
        files={[makePrepared("pdf-1", "application/pdf")]}
        onFiles={onFiles}
        docType="auto"
        onDocType={vi.fn()}
        loading={false}
        onSubmit={vi.fn()}
        onError={onError}
      />,
    );
    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "second.pdf", { type: "application/pdf" })] },
    });
    expect(onError).toHaveBeenCalledWith("one-pdf");
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("supports file removal and accessible add-more button", () => {
    const onFiles = vi.fn();
    const files = [makePrepared("doc-1")];

    render(
      <UploadPanel
        t={copy.en}
        lang="en"
        onLang={vi.fn()}
        files={files}
        onFiles={onFiles}
        docType="rent"
        onDocType={vi.fn()}
        loading={false}
        onSubmit={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.en.choose })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: copy.en.remove }));
    expect(onFiles).toHaveBeenCalledWith([]);
  });

  it("cycles loading messages and locks controls while analyzing", () => {
    vi.useFakeTimers();
    const files = [makePrepared("doc-1")];

    render(
      <UploadPanel
        t={copy.en}
        lang="en"
        onLang={vi.fn()}
        files={files}
        onFiles={vi.fn()}
        docType="loan"
        onDocType={vi.fn()}
        loading={true}
        onSubmit={vi.fn()}
        onError={vi.fn()}
      />,
    );

    const submit = screen.getByRole("button", { name: copy.en.reading[0]! });
    expect(submit).toBeDisabled();
    expect(screen.queryByRole("button", { name: copy.en.remove })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getByText(copy.en.reading[1]!)).toBeInTheDocument();
  });
});
