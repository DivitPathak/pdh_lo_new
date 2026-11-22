import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/explain-schema";

const ORDER: RiskLevel[] = ["red", "amber", "green"];
const ON: Record<RiskLevel, string> = {
  red: "bg-risk-red",
  amber: "bg-risk-amber",
  green: "bg-risk-green",
};

export function TrafficLight({
  active,
  blinking = false,
  className,
}: {
  active?: RiskLevel;
  blinking?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex flex-col gap-1.5 rounded-full bg-ink p-2", className)}
      aria-hidden
    >
      {ORDER.map((l, i) => (
        <span
          key={l}
          className={cn(
            "size-5 rounded-full transition-opacity",
            ON[l],
            active && active !== l && "opacity-20",
            blinking && "animate-blink-light",
          )}
          style={blinking ? { animationDelay: `${i * 0.35}s` } : undefined}
        />
      ))}
    </div>
  );
}
