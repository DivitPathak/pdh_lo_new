import { useEffect, useRef, useState } from "react";
import { Camera, FileText, FileUp, ShieldCheck, X } from "lucide-react";
import { Segmented } from "@/components/Segmented";
import { Button } from "@/components/ui/button";
import { DOC_TYPES, LANG_OPTIONS, type Copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { DocTypeChoice } from "@/lib/explain-schema";
import { MAX_FILES } from "@/lib/explain-schema";
import { prepareFile, type PreparedFile } from "@/lib/file-prep";
import type { Lang } from "@/lib/mask";

type Props = {
  t: Copy;
  lang: Lang;
  onLang: (l: Lang) => void;
  files: PreparedFile[];
  onFiles: (f: PreparedFile[]) => void;
  docType: DocTypeChoice;
  onDocType: (d: DocTypeChoice) => void;
  loading: boolean;
  onSubmit: () => void;
  onError: (key: string) => void;
};

export function UploadPanel(p: Props) {
  const { t } = p;
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!p.loading) return;
    setMsgIdx(0);
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % t.reading.length), 2600);
    return () => clearInterval(id);
  }, [p.loading, t.reading.length]);

  function clearInputs() {
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    if (p.files.length + incoming.length > MAX_FILES) {
      p.onError("max");
      clearInputs();
      return;
    }
    const existingHasPdf = p.files.some((f) => f.mime === "application/pdf");
    const incomingHasPdf = incoming.some(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if ((existingHasPdf || incomingHasPdf) && p.files.length + incoming.length > 1) {
      p.onError("one-pdf");
      clearInputs();
      return;
    }
    setBusy(true);
    try {
      const prepared = await Promise.all(incoming.map((f, i) => prepareFile(f, i)));
      p.onFiles([...p.files, ...prepared]);
    } catch (e) {
      p.onError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
      clearInputs();
    }
  }

  const disabled = p.loading || busy;

  return (
    <div className="paper-card relative overflow-hidden p-5 sm:p-7">
      {/* Step 1 */}
      <p className="mb-3 font-display text-lg font-semibold">
        <span className="mr-2 text-stamp">1.</span>
        {t.step1}
      </p>

      {p.files.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "paper-lines flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
            drag ? "border-primary bg-secondary" : "border-input bg-muted",
          )}
        >
          <FileUp className="size-9 text-primary" />
          <div>
            <p className="font-display text-lg font-semibold">{t.dropTitle}</p>
            <p className="text-sm text-muted-foreground">{t.dropHint}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="default" onClick={() => inputRef.current?.click()} disabled={disabled}>
              <FileText /> {t.choose}
            </Button>
            <Button variant="paper" onClick={() => cameraRef.current?.click()} disabled={disabled}>
              <Camera /> {t.camera}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {p.files.map((f, i) => (
            <div
              key={f.id}
              className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted shadow-paper"
            >
              {f.preview ? (
                <img src={f.preview} alt={`Page ${i + 1}`} className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1 text-primary">
                  <FileText className="size-8" />
                  <span className="text-xs font-semibold">PDF</span>
                </div>
              )}
              {p.loading && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[10%] animate-scan bg-gradient-to-b from-transparent via-accent/70 to-transparent" />
              )}
              <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 text-xs font-semibold text-paper">
                {i + 1}
              </span>
              {!p.loading && (
                <button
                  type="button"
                  aria-label={t.remove}
                  onClick={() => p.onFiles(p.files.filter((x) => x.id !== f.id))}
                  className="absolute right-1 top-1 rounded-full bg-ink p-1 text-paper hover:bg-destructive"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {p.files.length < MAX_FILES && !p.loading && (
            <button
              type="button"
              aria-label={t.choose}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-muted-foreground hover:border-primary hover:text-primary"
            >
              <FileUp className="size-6" />
              <span className="text-xs font-medium">+</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(e) => void addFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void addFiles(e.target.files)}
      />

      {/* Step 2 */}
      <p className="mb-3 mt-7 font-display text-lg font-semibold">
        <span className="mr-2 text-stamp">2.</span>
        {t.step2}
      </p>
      <Segmented
        label={t.step2}
        value={p.docType}
        onChange={p.onDocType}
        options={DOC_TYPES.map((v) => ({ value: v, label: t.types[v] }))}
      />

      {/* Step 3 */}
      <p className="mb-3 mt-7 font-display text-lg font-semibold">
        <span className="mr-2 text-stamp">3.</span>
        {t.step3}
      </p>
      <Segmented label={t.step3} value={p.lang} onChange={p.onLang} options={LANG_OPTIONS} />

      <Button
        variant="hero"
        size="xl"
        className="mt-8 w-full"
        disabled={p.files.length === 0 || disabled}
        onClick={p.onSubmit}
      >
        {p.loading ? <span aria-live="polite">{t.reading[msgIdx]}</span> : t.explain}
      </Button>

      <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        {t.privacyLong}
      </p>
    </div>
  );
}
