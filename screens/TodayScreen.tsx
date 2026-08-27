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
import { useNotice } from "@/components/notice-provider";
import { syncMood } from "@/lib/api/mood";
import type { MoodSyncData } from "@/lib/api/mood";
import { connectSpotify } from "@/lib/api/spotify";
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

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const CIRC = 2 * Math.PI * 44;

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" className="stroke-[#E9EEF5] dark:stroke-slate-700" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          className="stroke-navy"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - Math.min(100, Math.max(0, score)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none text-navy dark:text-slate-100">
          {Math.round(score)}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          score
        </span>
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
  const [syncing, setSyncing] = useState(false);
  const count = checkins.filter(Boolean).length;
  const moodScore = syncData?.moodScore ?? 41;

  useEffect(() => {
    void handleSync();
    const interval = setInterval(() => {
      void handleSync();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncMood();
      if (!res.error) setSyncData(res);
    } catch (err) {
      console.log("Sync failed:", err);
    } finally {
      setSyncing(false);
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
      value: syncData?.track?.name
        ? syncData.track.name
        : syncing
          ? "Fetching…"
          : "—",
      detail: syncData?.track?.artist
        ? `${syncData.track.artist}${syncData.track.isRecent ? " · recent" : ""}`
        : "Connect Spotify",
    },
    {
      icon: Heart,
      label: "Heart rate",
      value: syncData?.fitData?.heartRate
        ? `${Math.round(syncData.fitData.heartRate)} bpm`
        : "—",
      detail: syncData?.fitData?.heartRate ? "Latest reading" : "Connect Google Fit",
    },
    {
      icon: Footprints,
      label: "Steps",
      value: syncData?.fitData?.steps
        ? syncData.fitData.steps.toLocaleString()
        : "—",
      detail: syncData?.fitData?.steps ? "Today" : "Connect Google Fit",
    },
    {
      icon: Moon,
      label: "Sleep",
      value: syncData?.fitData?.sleepHours
        ? `${syncData.fitData.sleepHours}h`
        : "—",
      detail: syncData?.fitData?.sleepHours ? "Last night" : "Connect Google Fit",
    },
  ];

  return (
    <div className="space-y-5">
      <header className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
          <Button size="sm" onClick={handleSync} disabled={syncing}>
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9EEF5] text-navy dark:bg-slate-700 dark:text-slate-100">
                <Sparkles className="h-4 w-4" />
              </span>
              Mood score
            </CardTitle>
            <CardDescription>
              {latest?.mood_label
                ? `Latest check-in: ${latest.mood_label}`
                : "No recent check-in yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={moodScore} />
              <div>
                <p className="text-sm font-semibold text-navy dark:text-slate-100">
                  Mood score {moodScore}
                </p>
                <p className="mt-1 text-xs text-slate-500">out of 100</p>
                <Badge variant="secondary" className="mt-2">
                  {moodScore >= 60 ? "Positive" : moodScore >= 40 ? "Neutral" : "Low"}
                </Badge>
              </div>
            </div>
            <Progress value={moodScore} className="h-1.5" />
            {!syncData?.track?.name && (
              <Button variant="outline" size="sm" onClick={connectSpotify}>
                <Music2 className="h-4 w-4" />
                Connect Spotify
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Weekly streak</CardTitle>
            <CardDescription>{count} of 7 days checked in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-1.5">
              {DAYS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className={`flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold ${
                    checkins[i]
                      ? "bg-navy text-white"
                      : "bg-[#F4F6FA] text-slate-400 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <Progress value={(count / 7) * 100} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {signals.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-navy dark:text-slate-200">
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {s.label}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-lg font-bold leading-none text-navy dark:text-slate-100">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{s.detail}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9EEF5] text-navy dark:bg-slate-700 dark:text-slate-100">
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
