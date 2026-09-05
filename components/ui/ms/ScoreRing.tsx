import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CIRC = 2 * Math.PI * 44;

interface ScoreRingProps {
  score: number | null;
  loading?: boolean;
  size?: "md" | "lg";
  className?: string;
}

export function ScoreRing({ score, loading = false, size = "md", className }: ScoreRingProps) {
  const display = score ?? 0;
  const dim = size === "lg" ? "h-28 w-28" : "h-24 w-24";
  const textSize = size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div className={cn("relative shrink-0", dim, className)}>
      <div className="absolute inset-2 rounded-full bg-ms-sky-soft/60 blur-sm" aria-hidden />
      <svg viewBox="0 0 100 100" className={cn("relative -rotate-90", dim)}>
        <circle cx="50" cy="50" r="44" fill="none" className="stroke-ms-soft" strokeWidth="9" />
        {!loading && score != null && (
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            className="stroke-ms-navy transition-all duration-700 ease-out"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - Math.min(100, Math.max(0, display)) / 100)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-ms-mid" />
        ) : (
          <>
            <span className={cn("font-bold leading-none text-ms-ink", textSize)}>
              {score != null ? Math.round(score) : "—"}
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ms-ink3">
              score
            </span>
          </>
        )}
      </div>
    </div>
  );
}
