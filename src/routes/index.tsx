import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ResultView } from "@/components/ResultView";
import { Segmented } from "@/components/Segmented";
import { TrafficLight } from "@/components/TrafficLight";
import { UploadPanel } from "@/components/UploadPanel";
import { LANG_OPTIONS, copy } from "@/lib/copy";
import { explainDoc } from "@/lib/explain.functions";
import type { Analysis, DocTypeChoice } from "@/lib/explain-schema";
import type { PreparedFile } from "@/lib/file-prep";
import type { Lang } from "@/lib/mask";
import { riskStyles } from "@/lib/risk";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Padh Lo — Understand rent, loan & insurance papers before you sign" },
      {
        name: "description",
        content:
          "Upload a photo or PDF of your rent agreement, loan or insurance policy. Get a simple English or Hindi explanation, red/amber/green warnings and questions to ask. Private: nothing is stored.",
      },
      { property: "og:title", content: "Padh Lo — Read it before you sign it" },
      {
        property: "og:description",
        content:
          "Simple English or Hindi explanations of rent, loan and insurance documents, with red/amber/green warnings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [docType, setDocType] = useState<DocTypeChoice>("auto");
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    analysis: Analysis;
    maskedCount: number;
    lang: Lang;
  } | null>(null);
  const explain = useServerFn(explainDoc);
  const activeLang = result ? result.lang : lang;
  const t = copy[activeLang];

  useEffect(() => {
    document.documentElement.lang = activeLang;
  }, [activeLang]);

  const showError = (key: string) => toast.error(t.errors[key] ?? t.errors["failed"]);

  async function submit() {
    if (files.length === 0) return;
    const submitLang = lang;
    setLoading(true);
    try {
      const res = await explain({
        data: {
          language: submitLang,
          docType,
          files: files.map((f) => ({ mime: f.mime, dataUrl: f.dataUrl })),
        },
      });
      if (res.ok) {
        setResult({ analysis: res.analysis, maskedCount: res.maskedCount, lang: submitLang });
        setFiles([]); // drop the document from memory once explained
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else showError(res.error);
    } catch {
      showError("failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setFiles([]);
    setDocType("auto");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={reset} className="flex items-center gap-2.5 text-left">
            <TrafficLight className="scale-[0.55] -my-4 -mx-1.5" />
            <span className="leading-none">
              <span className="block font-display text-2xl font-bold tracking-tight">Padh Lo</span>
              <span className="block text-xs text-muted-foreground">पढ़ लो · {t.tagline}</span>
            </span>
          </button>
          <Segmented
            variant="bar"
            label="Language"
            value={activeLang}
            options={LANG_OPTIONS}
            disabled={Boolean(result)}
            onChange={setLang}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {result ? (
          <ResultView t={t} a={result.analysis} maskedCount={result.maskedCount} onReset={reset} />
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <section className="animate-rise lg:sticky lg:top-10">
              <span className="stamp text-stamp">{t.tagline}</span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
                {t.heroTitle}
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                {t.heroSub}
              </p>

              <ul className="mt-8 space-y-3">
                {(["red", "amber", "green"] as const).map((l) => (
                  <li key={l} className="flex items-center gap-3">
                    <span className={cn("risk-dot size-4", riskStyles[l].dot)} />
                    <span className="font-medium">{t.legend[l]}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex max-w-lg items-start gap-3 rounded-xl border border-dashed border-primary/40 bg-card p-4">
                <Lock className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm">
                  <span className="font-semibold">{t.privacy}</span>
                </p>
              </div>
            </section>

            <section className="animate-rise" style={{ animationDelay: "120ms" }}>
              <UploadPanel
                t={t}
                lang={lang}
                onLang={setLang}
                files={files}
                onFiles={setFiles}
                docType={docType}
                onDocType={setDocType}
                loading={loading}
                onSubmit={() => void submit()}
                onError={showError}
              />
            </section>
          </div>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5" /> {t.disclaimer}
        </p>
      </footer>
    </div>
  );
}
