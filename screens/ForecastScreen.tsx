"use client";

import { CloudSun, Loader2, RefreshCw } from "lucide-react";
import { ForecastPageSkeleton } from "@/components/Skeletons";
import { useForecast } from "@/lib/hooks/queries";
import type { ForecastItem } from "@/lib/api/forecast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MoodStyle {
  keys?: string[];
  icon: string;
  color: string;
}

const moodStyles: MoodStyle[] = [
  { keys: ["energetic", "excited"], icon: "⚡", color: "#E24B4A" },
  { keys: ["happy", "positive", "upbeat"], icon: "😊", color: "#1D9E75" },
  { keys: ["calm", "content", "relaxed", "good"], icon: "😌", color: "#378ADD" },
  { keys: ["tired", "low"], icon: "😴", color: "#EF9F27" },
  { keys: ["focused"], icon: "🎯", color: "#1E3A5F" },
  { keys: ["creative"], icon: "🎨", color: "#D85A30" },
];

function matchMood(mood?: string): MoodStyle {
  const text = mood?.toLowerCase() || "";
  return (
    moodStyles.find((m) => m.keys?.some((k) => text.includes(k))) || {
      icon: "✨",
      color: "#1E3A5F",
    }
  );
}

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
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Showing starter predictions while we gather more of your mood data. Check-ins
          and Spotify sync make this sharper over time.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {forecast.map((item, i) => {
          const style = matchMood(item.predictedMood);
          return (
            <Card
              key={`${item.timeLabel}-${i}`}
              className={cn(
                "ms-card-accent border-0 bg-gradient-to-br from-white to-[#f8fafc] dark:from-slate-800 dark:to-slate-900",
                i === 0 && "ring-1 ring-[#378ADD]/25 shadow-md",
              )}
            >
              <CardHeader className="pb-3">
                <Badge variant="secondary" className="w-fit gap-1.5 font-normal">
                  <span>{timeIcons[i] || "🕒"}</span>
                  {item.timeLabel}
                </Badge>
                <CardTitle className="flex items-center gap-2 pt-2 text-lg">
                  <span>{style.icon}</span>
                  {item.predictedMood}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Confidence</span>
                    <span>{item.confidence}%</span>
                  </div>
                  <Progress value={item.confidence} className="h-2" />
                </div>
                <div className="grid gap-3 text-sm">
                  <div>
                    <p className="mb-1 font-medium text-emerald-700 dark:text-emerald-400">
                      Do
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                      {item.doNow?.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 font-medium text-rose-700 dark:text-rose-400">
                      Avoid
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                      {item.avoid?.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4ECDC4] to-navy text-white shadow-sm">
            <CloudSun className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
              Mood Forecast
            </h2>
            <p className="text-sm text-muted-foreground">
              AI-powered predictions based on your patterns
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {forecast.length > 0 && (
        <ForecastCards forecast={forecast} source={source} />
      )}

      {forecast.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Based on your Spotify listening, fitness data, and past check-ins from the last
          7 days. Cached for 20 minutes — switching tabs won&apos;t reload this.
        </p>
      )}
    </div>
  );
}
