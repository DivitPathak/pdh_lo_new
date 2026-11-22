/**
 * Masks personal identifiers (Indian formats) in text before it is shown.
 * Pure and deterministic so it can run on the server after the AI answers.
 */
export type Lang = "en" | "hi";

type Rule = { key: string; en: string; hi: string; re: RegExp };

// Order matters: specific formats run before the generic long-number rule.
const RULES: Rule[] = [
  {
    key: "email",
    en: "Email",
    hi: "ईमेल",
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  { key: "pan", en: "PAN", hi: "PAN", re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g },
  { key: "ifsc", en: "IFSC", hi: "IFSC", re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g },
  {
    key: "aadhaar",
    en: "Aadhaar",
    hi: "आधार",
    re: /(?<![\d,.])\d{4}[\s-]\d{4}[\s-]\d{4}(?!(?:\d|[,.]\d))|(?<![\d,.])\d{12}(?!(?:\d|[,.]\d))/g,
  },
  {
    key: "phone",
    en: "Phone",
    hi: "फ़ोन",
    re: /(?<![\d,.])(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!(?:\d|[,.]\d))/g,
  },
  { key: "account", en: "Account", hi: "खाता", re: /(?<![\d,.])\d{9,18}(?!(?:\d|[,.]\d))/g },
];

const HAS_DIGIT_RE = /\d/;

export function maskText(text: string, lang: Lang = "en"): { text: string; count: number } {
  // Fast path: every rule requires either '@' (email) or at least one digit, and length >= 6.
  if (text.length < 6 || (!text.includes("@") && !HAS_DIGIT_RE.test(text))) {
    return { text, count: 0 };
  }

  let count = 0;
  let out = text;
  const isHindi = lang === "hi";
  for (const rule of RULES) {
    const label = `[${isHindi ? rule.hi : rule.en}]`;
    out = out.replace(rule.re, () => {
      count += 1;
      return label;
    });
  }
  return { text: out, count };
}

/** Masks every string inside a JSON-like value and returns the total count. */
export function maskDeep<T>(value: T, lang: Lang = "en"): { value: T; count: number } {
  let total = 0;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const r = maskText(v, lang);
      total += r.count;
      return r.text;
    }
    if (Array.isArray(v)) {
      const len = v.length;
      const out = new Array<unknown>(len);
      for (let i = 0; i < len; i++) out[i] = walk(v[i]);
      return out;
    }
    if (v && typeof v === "object") {
      const src = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(src)) out[k] = walk(src[k]);
      return out;
    }
    return v;
  };
  const masked = walk(value) as T;
  return { value: masked, count: total };
}
