import { Fragment, memo } from "react";

const TOKEN_RE = /(\[[^\]\n]{1,24}\])/g;

/** Renders privacy tokens like [Name] or [आधार] as dark "redacted" chips. */
export const MaskedText = memo(function MaskedText({ text }: { text: string }) {
  if (!text.includes("[")) return text;
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="masked-chip" title="Hidden for privacy">
            {p.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
});
