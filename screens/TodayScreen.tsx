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
import { Separator } from "@/components/ui/separator";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

interface TodayScreenProps {
  checkins: boolean[];
  latest: Checkin | null;
}

export default function TodayScreen({ checkins, latest }: TodayScreenProps) {
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
      alert("Export failed");
    }
  };

  const signals = [
    {
      icon: Music2,
      label: "Now playing",
      value: syncData?.track?.name
        ? `${syncData.track.name} · ${syncData.track.artist}${syncData.track.isRecent ? " (recent)" : ""}`
        : syncing
          ? "Fetching..."
          : "Nothing playing",
    },
    {
      icon: Heart,
      label: "Heart rate",
      value: syncData?.fitData?.heartRate
        ? `${Math.round(syncData.fitData.heartRate)} bpm`
        : "No data",
    },
    {
      icon: Footprints,
      label: "Steps today",
      value: syncData?.fitData?.steps
        ? `${syncData.fitData.steps.toLocaleString()} / 10,000`
        : "No data",
    },
    {
      icon: Moon,
      label: "Sleep last night",
      value: syncData?.fitData?.sleepHours
        ? `${syncData.fitData.sleepHours}h`
        : "No data",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Today</h2>
          <p className="text-sm text-muted-foreground">
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
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Mood score
            </CardTitle>
            <CardDescription>
              {latest?.mood_label
                ? `Latest check-in: ${latest.mood_label}`
                : "No recent check-in yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-5xl font-semibold tracking-tight tabular-nums">
                  {moodScore}
                </p>
                <p className="text-sm text-muted-foreground">out of 100</p>
              </div>
              <Badge variant="secondary">
                {moodScore >= 60
                  ? "Positive"
                  : moodScore >= 40
                    ? "Neutral"
                    : "Low"}
              </Badge>
            </div>
            <Progress value={moodScore} className="h-2.5" />
            {!syncData?.track?.name && (
              <Button variant="outline" size="sm" onClick={connectSpotify}>
                <Music2 className="h-4 w-4" />
                Connect Spotify for richer signals
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weekly streak</CardTitle>
            <CardDescription>{count} of 7 days checked in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              {DAYS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className={`flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-medium ${
                    checkins[i]
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <Progress value={(count / 7) * 100} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {signals.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="truncate text-sm font-medium">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Mood clock
          </CardTitle>
          <CardDescription>Your day mapped by mood periods</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <MoodClock />
        </CardContent>
      </Card>
    </div>
  );
}
