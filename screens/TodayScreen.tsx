"use client";

import { useQueryClient } from "@tanstack/react-query";
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
import { TodayPageSkeleton } from "@/components/Skeletons";
import { useNotice } from "@/components/notice-provider";
import { connectSpotify } from "@/lib/api/spotify";
import { connectGoogleFit } from "@/lib/api/googlefit";
import type { Checkin } from "@/lib/api/checkins";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsCard, MsCardHeader } from "@/components/ui/ms/MsCard";
import { MetricTile } from "@/components/ui/ms/MetricTile";
import { MsPill } from "@/components/ui/ms/MsPill";
import { MsProgress } from "@/components/ui/ms/MsProgress";
import { PageHeader, SectionHeading } from "@/components/ui/ms/PageHeader";
import { ScoreRing } from "@/components/ui/ms/ScoreRing";
import { WeekStreak } from "@/components/ui/ms/WeekStreak";
import { formatMoodLabel } from "@/lib/utils";
import { queryKeys, useMoodSync } from "@/lib/hooks/queries";

interface TodayScreenProps {
  checkins: boolean[];
  latest: Checkin | null;
}

export default function TodayScreen({ checkins, latest }: TodayScreenProps) {
  const notice = useNotice();
  const queryClient = useQueryClient();
  const { data: syncData, isPending, isFetching, isError } = useMoodSync();
  const moodScore = syncData?.moodScore ?? null;
  const spotifyConnected = syncData?.integrations?.spotify ?? false;
  const fitConnected = syncData?.integrations?.googleFit ?? false;
  const syncing = isFetching;
  const showSkeleton = isPending && !syncData;

  const handleSync = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.moodSync });
    } catch (err) {
      console.log("Sync failed:", err);
      notice.error("Sync failed", "Could not refresh your mood data. Please try again.");
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
        : spotifyConnected
          ? "Nothing playing right now"
          : "Connect Spotify to sync",
      action: !spotifyConnected ? connectSpotify : undefined,
      actionLabel: "Connect Spotify",
    },
    {
      icon: Heart,
      label: "Heart rate",
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
      value: syncData?.fitData?.sleepHours
        ? `${syncData.fitData.sleepHours}h`
        : syncing
          ? "Fetching…"
          : "—",
      detail: syncData?.fitData?.sleepHours ? "Last night" : fitConnected ? "No sleep data yet" : "Connect Google Fit",
    },
  ];

  if (showSkeleton) {
    return <TodayPageSkeleton />;
  }

  if (isError && !syncData) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-ms-ink2">Could not load mood data.</p>
        <MsButton size="sm" onClick={() => void handleSync()}>
          Retry
        </MsButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Today"
        title="Your mood right now"
        subtitle="Live mood from check-ins, Spotify, and Google Fit"
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <>
            <MsButton
              variant="secondary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={exportMoodData}
            >
              Export
            </MsButton>
            <MsButton
              size="sm"
              onClick={() => handleSync()}
              disabled={syncing}
              icon={
                syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )
              }
            >
              Sync
            </MsButton>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <MsCard elevated>
          <MsCardHeader
            title="Mood score"
            meta={
              latest?.mood_label
                ? `Latest check-in: ${formatMoodLabel(latest.mood_label)}`
                : "No check-in today yet — tap Check in above"
            }
            icon={<Sparkles size={16} />}
            action={
              moodScore != null ? (
                <MsPill tone={moodScore >= 60 ? "success" : moodScore >= 40 ? "brand" : "warning"}>
                  {moodScore >= 60 ? "Positive" : moodScore >= 40 ? "Neutral" : "Low"}
                </MsPill>
              ) : undefined
            }
          />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <ScoreRing score={moodScore} loading={syncing && moodScore == null} size="lg" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-lg font-semibold text-ms-ink">
                  {moodScore != null ? `Mood score ${Math.round(moodScore)}` : "Calculating…"}
                </p>
                <p className="mt-1 text-sm text-ms-ink2">Combined from your latest signals · out of 100</p>
              </div>
              {moodScore != null && <MsProgress value={moodScore} size="md" />}
            </div>
          </div>
        </MsCard>

        <WeekStreak checkins={checkins} />
      </div>

      <div className="space-y-3">
        <SectionHeading title="Health signals" meta="Synced from Spotify & Google Fit" />
        <div className="grid gap-3 sm:grid-cols-2">
          {signals.map((s) => (
            <MetricTile key={s.label} {...s} />
          ))}
        </div>
      </div>

      <MsCard elevated>
        <MsCardHeader
          title="Mood clock"
          meta="Your day mapped by mood periods"
          icon={<Activity size={16} />}
        />
        <div className="bg-ms-tint/20 p-4 sm:p-5">
          <MoodClock />
        </div>
      </MsCard>
    </div>
  );
}
