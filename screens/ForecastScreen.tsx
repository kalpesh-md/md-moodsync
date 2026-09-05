"use client";

import { CloudSun, Loader2, RefreshCw } from "lucide-react";
import { ForecastPageSkeleton } from "@/components/Skeletons";
import { useForecast } from "@/lib/hooks/queries";
import type { ForecastItem } from "@/lib/api/forecast";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsCard, MsCardHeader } from "@/components/ui/ms/MsCard";
import { MsPill } from "@/components/ui/ms/MsPill";

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
        <p className="rounded-xl border border-ms-line bg-ms-tint px-3 py-2 text-xs text-ms-ink2">
          Showing starter predictions while we gather more of your mood data. Check-ins
          and Spotify sync make this sharper over time.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {forecast.map((item, i) => (
          <MsCard key={`${item.timeLabel}-${i}`}>
            <div className="p-5">
              <MsPill tone="neutral" icon={<span>{timeIcons[i] || "🕒"}</span>}>
                {item.timeLabel}
              </MsPill>
              <h3 className="mt-3 flex items-center gap-2 text-lg font-semibold text-ms-ink">
                <span>{item.predictedMood}</span>
              </h3>
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-ms-ink3">
                  <span>Confidence</span>
                  <span>{item.confidence}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ms-soft">
                  <div
                    className="h-full rounded-full bg-ms-navy"
                    style={{ width: `${item.confidence}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="mb-1 font-medium text-ms-ink">Do</p>
                  <ul className="list-inside list-disc space-y-0.5 text-ms-ink2">
                    {item.doNow?.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-medium text-ms-ink">Avoid</p>
                  <ul className="list-inside list-disc space-y-0.5 text-ms-ink2">
                    {item.avoid?.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
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
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ms-soft text-ms-navy">
            <CloudSun className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ms-ink">
              Mood Forecast
            </h2>
            <p className="text-sm text-ms-ink2">
              AI-powered predictions based on your patterns
            </p>
          </div>
        </div>
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
      </div>

      {forecast.length > 0 && <ForecastCards forecast={forecast} source={source} />}

      {forecast.length > 0 && (
        <p className="text-xs text-ms-ink3">
          Based on your Spotify listening, fitness data, and past check-ins from the last
          7 days. Cached for 20 minutes — switching tabs won&apos;t reload this.
        </p>
      )}
    </div>
  );
}
