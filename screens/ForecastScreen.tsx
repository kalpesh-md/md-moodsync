"use client";

import React, { useState, useEffect } from "react";
import { CloudSun, Loader2 } from "lucide-react";
import { getForecast } from "@/lib/api/forecast";
import type { ForecastItem } from "@/lib/api/forecast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MoodStyle {
  keys?: string[];
  icon: string;
  color: string;
}

export default function ForecastScreen() {
  const [forecast, setForecast] = useState<ForecastItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      const data = await getForecast();
      setForecast(Array.isArray(data) ? data : null);
      setError(!Array.isArray(data));
    } catch (err) {
      console.log("Forecast error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const moodStyles: MoodStyle[] = [
    { keys: ["energetic", "excited"], icon: "⚡", color: "#E24B4A" },
    { keys: ["happy"], icon: "😊", color: "#1D9E75" },
    { keys: ["calm", "content", "relaxed"], icon: "😌", color: "#378ADD" },
    { keys: ["tired", "low"], icon: "😴", color: "#EF9F27" },
    { keys: ["focused"], icon: "🎯", color: "#1E3A5F" },
    { keys: ["creative"], icon: "🎨", color: "#D85A30" },
  ];

  const matchMood = (mood?: string): MoodStyle => {
    const text = mood?.toLowerCase() || "";
    return (
      moodStyles.find((m) => m.keys?.some((k) => text.includes(k))) || {
        icon: "✨",
        color: "#1E3A5F",
      }
    );
  };

  const timeIcons = ["⏰", "🌙", "☀️"];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
        <p className="text-sm">Analyzing your mood patterns…</p>
      </div>
    );
  }

  if (error || !forecast || forecast.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <CloudSun className="h-5 w-5" />
          </div>
          <CardTitle>Mood Forecast</CardTitle>
          <CardDescription>
            We couldn&apos;t generate a forecast right now. Try again shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
          Mood Forecast
        </h2>
        <p className="text-sm text-muted-foreground">
          AI-powered predictions based on your patterns
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {forecast.map((item, i) => {
          const style = matchMood(item.predictedMood);
          return (
            <Card
              key={i}
              className={cn(
                i === 0 && "border-navy/30 shadow-md ring-1 ring-navy/10",
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

      <p className="text-xs text-muted-foreground">
        Based on your Spotify listening, fitness data, and past check-ins.
      </p>
    </div>
  );
}
