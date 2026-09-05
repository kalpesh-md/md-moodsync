"use client";

import { Check, CloudSun, Loader2, RefreshCw, X } from "lucide-react";
import { ForecastPageSkeleton } from "@/components/Skeletons";
import { useForecast } from "@/lib/hooks/queries";
import type { ForecastItem } from "@/lib/api/forecast";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsCard } from "@/components/ui/ms/MsCard";
import { MsPill } from "@/components/ui/ms/MsPill";
import { MsProgress } from "@/components/ui/ms/MsProgress";
import { PageHeader } from "@/components/ui/ms/PageHeader";
import { cn } from "@/lib/utils";

const timeIcons = ["⏰", "🌙", "☀️"];

function ForecastCards({
  forecast,
  source,
}: {
  forecast: ForecastItem[];
  source?: string;
}) {
  return (
    <>
      {source === "mock" || source === "fallback" ? (
        <div className="rounded-2xl border border-ms-line bg-ms-tint px-4 py-3 text-sm leading-relaxed text-ms-ink2">
          Showing starter predictions while we gather more of your mood data. Check-ins
          and Spotify sync make this sharper over time.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {forecast.map((item, i) => (
          <MsCard
            key={`${item.timeLabel}-${i}`}
            elevated={i === 0}
            className={cn(i === 0 && "ring-1 ring-ms-navy/10")}
          >
            <div className="border-b border-ms-line bg-ms-tint/40 px-5 py-4">
              <MsPill tone={i === 0 ? "brand" : "neutral"} icon={<span>{timeIcons[i] || "🕒"}</span>}>
                {item.timeLabel}
              </MsPill>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-ms-ink">
                {item.predictedMood}
              </h3>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-ms-ink3">
                  <span>Confidence</span>
                  <span>{item.confidence}%</span>
                </div>
                <MsProgress value={item.confidence} />
              </div>
            </div>
            <div className="grid gap-4 p-5 text-sm">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ms-emerald">
                  <Check className="h-3.5 w-3.5" />
                  Do
                </p>
                <ul className="ms-tip-list space-y-2">
                  {item.doNow?.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ms-ink3">
                  <X className="h-3.5 w-3.5" />
                  Avoid
                </p>
                <ul className="ms-tip-list space-y-2">
                  {item.avoid?.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </MsCard>
        ))}
      </div>
    </>
  );
}

export default function ForecastScreen() {
  const { data, isPending, isFetching, refetch } = useForecast();
  const forecast = data?.forecast ?? [];
  const source = data?.source;
  const showSkeleton = isPending && forecast.length === 0;

  if (showSkeleton) {
    return <ForecastPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Forecast"
        title="Mood forecast"
        subtitle="AI-powered predictions based on your patterns"
        icon={<CloudSun className="h-5 w-5" />}
        actions={
          <MsButton
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            icon={
              isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )
            }
          >
            Refresh
          </MsButton>
        }
      />

      {forecast.length > 0 && <ForecastCards forecast={forecast} source={source} />}

      {forecast.length > 0 && (
        <p className="px-1 text-xs leading-relaxed text-ms-ink3">
          Based on your Spotify listening, fitness data, and past check-ins from the last
          7 days. Cached for 20 minutes — switching tabs won&apos;t reload this.
        </p>
      )}
    </div>
  );
}
