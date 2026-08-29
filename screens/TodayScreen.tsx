"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Download,
  Footprints,
  Heart,
  Loader2,
  Moon,
  Music2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import MoodClock from "@/components/MoodClock";
import { InlineLoader } from "@/components/Loaders";
import { useNotice } from "@/components/notice-provider";
import { syncMood } from "@/lib/api/mood";
import type { MoodSyncData } from "@/lib/api/mood";
import { connectSpotify } from "@/lib/api/spotify";
import { connectGoogleFit } from "@/lib/api/googlefit";
import type { Checkin } from "@/lib/api/checkins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMoodLabel } from "@/lib/utils";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const CIRC = 2 * Math.PI * 44;

function scoreColor(score: number): string {
  if (score >= 60) return "#10b981";
  if (score >= 40) return "#378ADD";
  return "#f59e0b";
}

function ScoreRing({ score, loading }: { score: number | null; loading: boolean }) {
  const display = score ?? 0;
  const color = score != null ? scoreColor(score) : "#94a3b8";

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          className="stroke-[#E9EEF5] dark:stroke-slate-700"
          strokeWidth="9"
        />
        {!loading && score != null && (
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - Math.min(100, Math.max(0, display)) / 100)}
            className="transition-all duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-navy-mid" />
        ) : (
          <>
            <span className="text-3xl font-bold leading-none text-navy dark:text-slate-100">
              {score != null ? Math.round(score) : "—"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              score
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface TodayScreenProps {
  checkins: boolean[];
  latest: Checkin | null;
}

export default function TodayScreen({ checkins, latest }: TodayScreenProps) {
  const notice = useNotice();
  const [syncData, setSyncData] = useState<MoodSyncData | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const count = checkins.filter(Boolean).length;
  const moodScore = syncData?.moodScore ?? null;
  const spotifyConnected = syncData?.integrations?.spotify ?? false;
  const fitConnected = syncData?.integrations?.googleFit ?? false;

  useEffect(() => {
    void handleSync(true);
    const interval = setInterval(() => {
      void handleSync(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async (isInitial = false) => {
    setSyncing(true);
    try {
      const res = await syncMood();
      if (!res.error) setSyncData(res);
    } catch (err) {
      console.log("Sync failed:", err);
      if (isInitial) {
        notice.error("Sync failed", "Could not load your mood data. Tap Sync to retry.");
      }
    } finally {
      setSyncing(false);
      if (isInitial) setInitialLoad(false);
    }
  };

  const exportMoodData = async () => {
    try {
      const checkinsRes = await fetch("/api/checkins", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const checkinsData = await checkinsRes.json();
      let csv = "Date,Mood,Note\n";
      checkinsData.checkins?.forEach((checkin: Checkin) => {
        csv += `${new Date(checkin.created_at).toLocaleDateString()},`;
        csv += `${checkin.mood_label},`;
        csv += `"${(checkin.note || "").replace(/"/g, '""')}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moodsync_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      notice.error("Export failed", "We couldn't download your check-ins. Please try again.");
    }
  };

  const signals = [
    {
      icon: Music2,
      label: "Listening",
      accent: "#1DB954",
      value: syncData?.track?.name
        ? syncData.track.name
        : syncing
          ? "Fetching…"
          : "—",
      detail: syncData?.track?.artist
        ? `${syncData.track.artist}${syncData.track.isRecent ? " · recent" : ""}`
        : spotifyConnected
          ? "Nothing playing right now"
          : "Connect Spotify to sync",
      action: !spotifyConnected ? connectSpotify : undefined,
      actionLabel: "Connect Spotify",
    },
    {
      icon: Heart,
      label: "Heart rate",
      accent: "#ef4444",
      value: syncData?.fitData?.heartRate
        ? `${Math.round(syncData.fitData.heartRate)} bpm`
        : syncing
          ? "Fetching…"
          : "—",
      detail: syncData?.fitData?.heartRate ? "Latest reading" : fitConnected ? "No reading yet" : "Connect Google Fit",
      action: !fitConnected ? connectGoogleFit : undefined,
      actionLabel: "Connect Fit",
    },
    {
      icon: Footprints,
      label: "Steps",
      accent: "#378ADD",
      value: syncData?.fitData?.steps
        ? syncData.fitData.steps.toLocaleString()
        : syncing
          ? "Fetching…"
          : "—",
      detail: syncData?.fitData?.steps ? "Today" : fitConnected ? "No steps yet" : "Connect Google Fit",
    },
    {
      icon: Moon,
      label: "Sleep",
      accent: "#7F77DD",
      value: syncData?.fitData?.sleepHours
        ? `${syncData.fitData.sleepHours}h`
        : syncing
          ? "Fetching…"
          : "—",
      detail: syncData?.fitData?.sleepHours ? "Last night" : fitConnected ? "No sleep data yet" : "Connect Google Fit",
    },
  ];

  if (initialLoad && syncing) {
    return <InlineLoader message="Calculating your mood score…" />;
  }

  return (
    <div className="space-y-5">
      <header className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#378ADD]">
            Today
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-slate-100">
            Your mood right now
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live mood from check-ins, Spotify, and Google Fit
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportMoodData}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => handleSync()} disabled={syncing} className="bg-gradient-to-r from-navy to-navy-mid">
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="ms-card-accent overflow-hidden border-0 bg-gradient-to-br from-white via-white to-[#f0f9ff] dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-[#378ADD] text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              Mood score
            </CardTitle>
            <CardDescription>
              {latest?.mood_label
                ? `Latest check-in: ${formatMoodLabel(latest.mood_label)}`
                : "No check-in today yet — tap Check in above"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={moodScore} loading={syncing && moodScore == null} />
              <div>
                <p className="text-sm font-semibold text-navy dark:text-slate-100">
                  {moodScore != null ? `Mood score ${Math.round(moodScore)}` : "Calculating…"}
                </p>
                <p className="mt-1 text-xs text-slate-500">out of 100</p>
                {moodScore != null && (
                  <Badge
                    variant="secondary"
                    className="mt-2"
                    style={{
                      backgroundColor: `${scoreColor(moodScore)}18`,
                      color: scoreColor(moodScore),
                    }}
                  >
                    {moodScore >= 60 ? "Positive" : moodScore >= 40 ? "Neutral" : "Low"}
                  </Badge>
                )}
              </div>
            </div>
            {moodScore != null && <Progress value={moodScore} className="h-2" />}
          </CardContent>
        </Card>

        <Card className="ms-card-accent border-0 bg-gradient-to-br from-white to-[#eef2ff] dark:from-slate-800 dark:to-slate-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Weekly streak</CardTitle>
            <CardDescription>{count} of 7 days checked in this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-1.5">
              {DAYS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className={`flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                    checkins[i]
                      ? "bg-gradient-to-br from-navy to-navy-mid text-white shadow-sm"
                      : "bg-white/80 text-slate-400 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <Progress value={(count / 7) * 100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {signals.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="ms-card-accent overflow-hidden border-0 bg-white dark:bg-slate-800/80"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${s.accent}18`, color: s.accent }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {s.label}
                    </span>
                  </div>
                  {s.action && (
                    <Button variant="outline" size="sm" onClick={s.action} className="h-7 text-xs">
                      {s.actionLabel}
                    </Button>
                  )}
                </div>
                <div className="mt-2 truncate text-lg font-bold leading-none text-navy dark:text-slate-100">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{s.detail}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="ms-card-accent border-0 bg-gradient-to-br from-white to-[#f0fdf4] dark:from-slate-800 dark:to-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </span>
            Mood clock
          </CardTitle>
          <CardDescription>Your day mapped by mood periods</CardDescription>
        </CardHeader>
        <CardContent>
          <MoodClock />
        </CardContent>
      </Card>
    </div>
  );
}
