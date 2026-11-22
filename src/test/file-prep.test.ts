import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_PDF_BYTES, prepareFile } from "@/lib/file-prep";

describe("prepareFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prepares a valid PDF upload and normalizes its data URL", async () => {
    const file = new File(["%PDF-1.4\nhello"], "agreement.pdf", { type: "application/pdf" });
    const prepared = await prepareFile(file, 0);

    expect(prepared.mime).toBe("application/pdf");
    expect(prepared.preview).toBeNull();
    expect(prepared.label).toBe("PDF");
    expect(prepared.dataUrl).toMatch(/^data:application\/pdf;base64,.+/);
  });

  it("rejects empty (0-byte) documents", async () => {
    const emptyPdf = new File([], "empty.pdf", { type: "application/pdf" });
    await expect(prepareFile(emptyPdf, 0)).rejects.toThrow("empty-file");

    const emptyImg = new File([], "empty.jpg", { type: "image/jpeg" });
    await expect(prepareFile(emptyImg, 0)).rejects.toThrow("empty-file");
  });

  it("rejects invalid file formats", async () => {
    const textFile = new File(["hello"], "terms.txt", { type: "text/plain" });
    await expect(prepareFile(textFile, 0)).rejects.toThrow("type");

    const docxFile = new File(["binary"], "contract.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await expect(prepareFile(docxFile, 0)).rejects.toThrow("type");
  });

  it("accepts a large PDF at the 10 MB limit and rejects anything above it", async () => {
    const exactLimitPdf = new File([new Uint8Array(MAX_PDF_BYTES)], "large-valid.pdf", {
      type: "application/pdf",
    });
    const prepared = await prepareFile(exactLimitPdf, 0);
    expect(prepared.mime).toBe("application/pdf");
    expect(prepared.dataUrl.startsWith("data:application/pdf;base64,")).toBe(true);

    const overLimitPdf = new File([new Uint8Array(MAX_PDF_BYTES + 1)], "too-big.pdf", {
      type: "application/pdf",
    });
    await expect(prepareFile(overLimitPdf, 0)).rejects.toThrow("too-big");
  });

  it("rejects when file reading or image decoding fails", async () => {
    const pdf = new File(["%PDF-1.4"], "broken.pdf", { type: "application/pdf" });
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, "error", { value: new Error("read failure") });
      this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
    });
    await expect(prepareFile(pdf, 0)).rejects.toThrow("read failure");

    const badImg = new File(["not-an-image"], "corrupt.png", { type: "image/png" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:corrupt");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const originalImage = globalThis.Image;
    class FailingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", FailingImage);
    try {
      await expect(prepareFile(badImg, 0)).rejects.toThrow("image");
    } finally {
      vi.stubGlobal("Image", originalImage);
    }
  });
});
