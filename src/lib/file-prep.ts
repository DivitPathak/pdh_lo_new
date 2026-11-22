// Browser-only helpers: turn picked files into compact data URLs for one-time reading.
export type PreparedFile = {
  id: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  dataUrl: string;
  preview: string | null; // image thumbnail, null for PDFs
  label: string;
};

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 2000;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function drawToJpegDataUrl(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function shrinkImage(file: File): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return drawToJpegDataUrl(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall back to HTMLImageElement decoding for formats createImageBitmap cannot handle.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    return drawToJpegDataUrl(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareFile(file: File, index: number): Promise<PreparedFile> {
  if (file.size === 0) throw new Error("empty-file");
  const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (file.size > MAX_PDF_BYTES) throw new Error("too-big");
    const raw = await readAsDataUrl(file);
    const dataUrl = raw.replace(/^data:[^;]*;base64,/, "data:application/pdf;base64,");
    return { id, mime: "application/pdf", dataUrl, preview: null, label: "PDF" };
  }
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error("type");
  }
  const dataUrl = await shrinkImage(file).catch(() => {
    throw new Error("image");
  });
  return { id, mime: "image/jpeg", dataUrl, preview: dataUrl, label: "Photo" };
}
