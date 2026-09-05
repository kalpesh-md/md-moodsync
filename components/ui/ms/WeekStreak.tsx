import { Check, Flame } from "lucide-react";
import { MsCard } from "@/components/ui/ms/MsCard";
import { cn } from "@/lib/utils";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

interface WeekStreakProps {
  checkins: boolean[];
  className?: string;
}

export function WeekStreak({ checkins, className }: WeekStreakProps) {
  const count = checkins.filter(Boolean).length;

  return (
    <MsCard elevated className={cn("overflow-hidden", className)}>
      <div className="border-b border-ms-line bg-ms-tint/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="ms-icon-ring flex h-11 w-11 items-center justify-center rounded-xl bg-ms-amber-soft text-ms-amber">
            <Flame size={20} />
          </span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold leading-none tracking-tight text-ms-ink">
                {count}
              </span>
              <span className="text-sm font-semibold text-ms-ink2">days this week</span>
            </div>
            <p className="mt-1 text-xs text-ms-ink3">{count} of 7 days checked in</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex justify-between gap-1">
          {DAYS.map((d, i) => {
            const done = checkins[i];
            return (
              <div key={`${d}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold transition-colors",
                    done
                      ? "bg-ms-navy text-white shadow-[0_2px_8px_rgba(30,58,95,0.25)]"
                      : "border border-dashed border-ms-line-strong bg-ms-card text-ms-ink3",
                  )}
                >
                  {done ? <Check size={14} /> : d}
                </span>
                <span className="text-[10px] font-semibold text-ms-ink3">{d}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ms-soft">
          <div
            className="h-full rounded-full bg-ms-navy transition-all duration-500"
            style={{ width: `${(count / 7) * 100}%` }}
          />
        </div>
      </div>
    </MsCard>
  );
}
