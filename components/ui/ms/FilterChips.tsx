import { cn } from "@/lib/utils";

interface FilterChipsProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-full border border-ms-line bg-ms-tint p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-ms-navy text-white shadow-[0_1px_3px_rgba(30,58,95,0.2)]"
                : "text-ms-ink2 hover:bg-ms-card hover:text-ms-navy",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
