import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy as CopyIcon,
  EyeOff,
  MessageCircleQuestion,
  OctagonAlert,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MaskedText } from "@/components/MaskedText";
import { TrafficLight } from "@/components/TrafficLight";
import { cn } from "@/lib/utils";
import type { Copy } from "@/lib/copy";
import type { Analysis, RiskLevel } from "@/lib/explain-schema";
import { riskStyles } from "@/lib/risk";

const ICON: Record<RiskLevel, typeof OctagonAlert> = {
  red: OctagonAlert,
  amber: AlertTriangle,
  green: CheckCircle2,
};

export function ResultView({
  t,
  a,
  maskedCount,
  onReset,
}: {
  t: Copy;
  a: Analysis;
  maskedCount: number;
  onReset: () => void;
}) {
  const counts = useMemo(() => {
    const out: Record<RiskLevel, number> = { red: 0, amber: 0, green: 0 };
    for (const w of a.warnings) out[w.level] += 1;
    return out;
  }, [a.warnings]);

  if (!a.readable) {
    return (
      <div className="paper-card mx-auto max-w-xl animate-rise p-8 text-center">
        <TrafficLight className="mx-auto" active="amber" />
        <h2 className="mt-4 text-2xl font-semibold">{t.unreadable}</h2>
        <p className="mt-2 text-muted-foreground">
          <MaskedText text={a.unreadable_reason} />
        </p>
        <Button variant="hero" size="lg" className="mt-6" onClick={onReset}>
          <RotateCcw /> {t.tryAgain}
        </Button>
      </div>
    );
  }

  const v = riskStyles[a.verdict];
  const hiddenTotal = Math.max(maskedCount, 0);

  async function copyQuestions() {
    const text = a.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.copied);
    } catch {
      toast.error(t.errors["failed"]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <section className={cn("paper-card animate-rise overflow-hidden border-l-8", v.border)}>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <TrafficLight active={a.verdict} className="self-start" />
          <div className="flex-1">
            <span className={cn("stamp", v.text)}>{t.verdict[a.verdict]}</span>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              <MaskedText text={a.title} />
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              <MaskedText text={a.verdict_reason} />
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {(["red", "amber", "green"] as const).map((l) => (
                <span key={l} className="inline-flex items-center gap-1.5 font-medium">
                  <span className={cn("risk-dot", riskStyles[l].dot)} />
                  {counts[l]} · {t.legend[l]}
                </span>
              ))}
            </div>
          </div>
        </div>
        {(hiddenTotal > 0 || a.masked_types.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 border-t bg-muted px-6 py-3 text-sm sm:px-8">
            <EyeOff className="size-4 text-primary" />
            <span className="font-medium">
              {a.masked_types.length > 0 ? t.hiddenTypes : t.hiddenCount(hiddenTotal)}
            </span>
            {a.masked_types.map((m) => (
              <span key={m} className="masked-chip">
                {m}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Summary + key facts */}
        <div className="space-y-6 lg:col-span-2">
          <section className="paper-card animate-rise p-6" style={{ animationDelay: "80ms" }}>
            <h3 className="text-xl font-semibold">{t.summary}</h3>
            <p className="mt-3 text-[1.05rem] leading-relaxed">
              <MaskedText text={a.summary} />
            </p>
          </section>

          {a.key_facts.length > 0 && (
            <section className="paper-card animate-rise p-6" style={{ animationDelay: "140ms" }}>
              <h3 className="text-xl font-semibold">{t.keyFacts}</h3>
              <dl className="mt-3 divide-y divide-dashed">
                {a.key_facts.map((f, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="w-28 shrink-0 text-sm text-muted-foreground">
                      <MaskedText text={f.label} />
                    </dt>
                    <dd className="text-right font-semibold leading-snug">
                      <MaskedText text={f.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        {/* Warnings */}
        <section className="animate-rise lg:col-span-3" style={{ animationDelay: "200ms" }}>
          <h3 className="mb-3 text-xl font-semibold">{t.warnings}</h3>
          <ul className="space-y-3">
            {a.warnings.map((w, i) => {
              const s = riskStyles[w.level];
              const Icon = ICON[w.level];
              return (
                <li
                  key={i}
                  className={cn("rounded-xl border-l-4 p-4 shadow-paper", s.soft, s.border)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("mt-0.5 size-5 shrink-0", s.text)} />
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">
                        <span
                          className={cn("mr-2 text-xs font-bold uppercase tracking-wider", s.text)}
                        >
                          {t.legend[w.level]}
                        </span>
                        <br className="sm:hidden" />
                        <MaskedText text={w.title} />
                      </p>
                      <p className="mt-1 leading-relaxed">
                        <MaskedText text={w.explanation} />
                      </p>
                      {w.clause && (
                        <p className="mt-2 border-l-2 border-input pl-3 text-sm italic text-muted-foreground">
                          “<MaskedText text={w.clause} />”
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Questions */}
      {a.questions.length > 0 && (
        <section
          className="paper-card paper-lines animate-rise p-6 sm:p-8"
          style={{ animationDelay: "260ms" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-2xl font-semibold">
              <MessageCircleQuestion className="size-6 text-stamp" />
              {t.questions}
            </h3>
            <Button variant="paper" size="sm" onClick={() => void copyQuestions()}>
              <CopyIcon /> {t.copyQs}
            </Button>
          </div>
          <ol className="mt-4 space-y-3 pl-10 sm:pl-14">
            {a.questions.map((q, i) => (
              <li key={i} className="relative text-[1.05rem] leading-relaxed">
                <span className="absolute -left-9 font-display text-lg font-bold text-stamp sm:-left-12">
                  {i + 1}.
                </span>
                <MaskedText text={q} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Button variant="hero" size="lg" onClick={onReset}>
          <RotateCcw /> {t.startOver}
        </Button>
        <p className="text-xs text-muted-foreground">{t.clearNote}</p>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">{t.disclaimer}</p>
      </div>
    </div>
  );
}
