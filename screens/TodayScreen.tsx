"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Check,
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
import { MsPill } from "@/components/ui/ms/MsPill";
import { formatMoodLabel } from "@/lib/utils";
import { queryKeys, useMoodSync } from "@/lib/hooks/queries";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const CIRC = 2 * Math.PI * 44;

function ScoreRing({ score, loading }: { score: number | null; loading: boolean }) {
  const display = score ?? 0;

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" className="stroke-ms-soft" strokeWidth="9" />
        {!loading && score != null && (
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            className="stroke-ms-navy"
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
            <span className="text-2xl font-bold leading-none text-ms-ink">
              {score != null ? Math.round(score) : "—"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ms-ink3">
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
  const queryClient = useQueryClient();
  const { data: syncData, isPending, isFetching, isError } = useMoodSync();
  const count = checkins.filter(Boolean).length;
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
    <div className="space-y-5">
      <header className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ms-ink3">
            Today
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ms-ink">
            Your mood right now
          </h2>
          <p className="mt-1 text-sm text-ms-ink2">
            Live mood from check-ins, Spotify, and Google Fit
          </p>
        </div>
        <div className="flex gap-2">
          <MsButton variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={exportMoodData}>
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
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <MsCard>
          <MsCardHeader
            title="Mood score"
            meta={
              latest?.mood_label
                ? `Latest check-in: ${formatMoodLabel(latest.mood_label)}`
                : "No check-in today yet — tap Check in above"
            }
            icon={<Sparkles size={16} />}
          />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={moodScore} loading={syncing && moodScore == null} />
              <div>
                <p className="text-sm font-semibold text-ms-ink">
                  {moodScore != null ? `Mood score ${Math.round(moodScore)}` : "Calculating…"}
                </p>
                <p className="mt-1 text-xs text-ms-ink3">out of 100</p>
                {moodScore != null && (
                  <MsPill tone="brand" className="mt-2">
                    {moodScore >= 60 ? "Positive" : moodScore >= 40 ? "Neutral" : "Low"}
                  </MsPill>
                )}
              </div>
            </div>
            {moodScore != null && (
              <div className="h-2 overflow-hidden rounded-full bg-ms-soft">
                <div
                  className="h-full rounded-full bg-ms-navy transition-all"
                  style={{ width: `${moodScore}%` }}
                />
              </div>
            )}
          </div>
        </MsCard>

        <MsCard className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ms-amber-soft text-ms-amber">
              <Activity size={20} />
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
          <div className="mt-4 flex gap-1.5">
            {DAYS.map((d, i) => {
              const done = checkins[i];
              return (
                <div key={`${d}-${i}`} className="flex flex-col items-center gap-1">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold ${
                      done
                        ? "bg-ms-navy text-white"
                        : "border border-dashed border-ms-line-strong text-ms-ink3"
                    }`}
                  >
                    {done ? <Check size={13} /> : d}
                  </span>
                  <span className="text-[10px] font-semibold text-ms-ink3">{d}</span>
                </div>
              );
            })}
          </div>
        </MsCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {signals.map((s) => {
          const Icon = s.icon;
          return (
            <MsCard key={s.label}>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ms-soft text-ms-navy">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ms-ink3">
                      {s.label}
                    </span>
                  </div>
                  {s.action && (
                    <MsButton variant="secondary" size="sm" onClick={s.action}>
                      {s.actionLabel}
                    </MsButton>
                  )}
                </div>
                <div className="mt-2 truncate text-lg font-bold leading-none text-ms-ink">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] text-ms-ink3">{s.detail}</div>
              </div>
            </MsCard>
          );
        })}
      </div>

      <MsCard>
        <MsCardHeader
          title="Mood clock"
          meta="Your day mapped by mood periods"
          icon={<Activity size={16} />}
        />
        <div className="p-5">
          <MoodClock />
        </div>
      </MsCard>
    </div>
  );
}
