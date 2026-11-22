import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  variant = "chips",
  disabled = false,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  variant?: "chips" | "bar";
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={
        variant === "bar" ? "flex rounded-full border bg-card p-1 text-sm" : "flex flex-wrap gap-2"
      }
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={
            variant === "bar"
              ? cn(
                  "rounded-full px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  value === o.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              : cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  value === o.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground hover:bg-secondary",
                )
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
