import { z } from "zod";

export const riskLevel = z.enum(["red", "amber", "green"]);
export type RiskLevel = z.infer<typeof riskLevel>;

export const docTypeChoice = z.enum(["auto", "rent", "loan", "insurance"]);
export type DocTypeChoice = z.infer<typeof docTypeChoice>;

export const MAX_FILES = 5;
export const MAX_FILE_CHARS = 14_000_000; // ~10 MB once base64-encoded
export const MAX_TOTAL_CHARS = 18_000_000;

export const explainInput = z.object({
  language: z.enum(["en", "hi"]),
  docType: docTypeChoice,
  files: z
    .array(
      z.object({
        mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        dataUrl: z
          .string()
          .max(MAX_FILE_CHARS)
          .regex(/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,.+/),
      }),
    )
    .min(1)
    .max(MAX_FILES)
    .refine(
      (files) => files.filter((f) => f.mime === "application/pdf").length <= 1,
      "At most one PDF file is allowed",
    )
    .refine(
      (files) => files.reduce((sum, f) => sum + f.dataUrl.length, 0) <= MAX_TOTAL_CHARS,
      "Total upload size exceeds the allowed limit",
    ),
});
export type ExplainInput = z.infer<typeof explainInput>;

export const analysis = z.object({
  readable: z.boolean(),
  unreadable_reason: z.string(),
  doc_type: z.enum(["rent", "loan", "insurance", "other"]),
  title: z.string(),
  verdict: riskLevel,
  verdict_reason: z.string(),
  summary: z.string(),
  key_facts: z.array(z.object({ label: z.string(), value: z.string() })),
  warnings: z.array(
    z.object({ level: riskLevel, title: z.string(), explanation: z.string(), clause: z.string() }),
  ),
  questions: z.array(z.string()),
  masked_types: z.array(z.string()),
});
export type Analysis = z.infer<typeof analysis>;

export type ExplainResult =
  { ok: true; analysis: Analysis; maskedCount: number } | { ok: false; error: string };
