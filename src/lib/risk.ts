import type { RiskLevel } from "./explain-schema";

export const riskStyles: Record<
  RiskLevel,
  { dot: string; soft: string; text: string; border: string }
> = {
  red: {
    dot: "bg-risk-red",
    soft: "bg-risk-red-soft",
    text: "text-risk-red",
    border: "border-risk-red",
  },
  amber: {
    dot: "bg-risk-amber",
    soft: "bg-risk-amber-soft",
    text: "text-risk-amber",
    border: "border-risk-amber",
  },
  green: {
    dot: "bg-risk-green",
    soft: "bg-risk-green-soft",
    text: "text-risk-green",
    border: "border-risk-green",
  },
};
