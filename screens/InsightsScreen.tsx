"use client";

import { Brain, Sparkles } from "lucide-react";
import { InsightsPageSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { MsCard, MsCardHeader } from "@/components/ui/ms/MsCard";
import { MsPill } from "@/components/ui/ms/MsPill";
import { MsProgress } from "@/components/ui/ms/MsProgress";
import { PageHeader } from "@/components/ui/ms/PageHeader";
import { useCheckins, usePersonality } from "@/lib/hooks/queries";
import { getCheckinMoods } from "@/lib/checkinMoods";
import { formatMoodLabel } from "@/lib/utils";

const OCEAN_TRAITS = [
  { key: "O" as const, name: "Openness", short: "Open" },
  { key: "C" as const, name: "Conscientiousness", short: "Discipline" },
  { key: "E" as const, name: "Extraversion", short: "Social" },
  { key: "A" as const, name: "Agreeableness", short: "Warmth" },
  { key: "N" as const, name: "Neuroticism", short: "Sensitivity" },
] as const;

function MiniGauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const dash = 2 * Math.PI * 28;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-14 sm:h-16 sm:w-16">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r="28" fill="none" className="stroke-ms-soft" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            className="stroke-ms-navy"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={dash * (1 - v / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-ms-ink">{v}</span>
        </div>
      </div>
      <span className="mt-1 text-[10px] font-semibold text-ms-ink3">{label}</span>
    </div>
  );
}

function TraitRow({
  letter,
  name,
  value,
}: {
  letter: string;
  name: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ms-soft text-xs font-bold text-ms-navy">
        {letter}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-ms-ink">{name}</span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-ms-navy">{value}</span>
        </div>
        <MsProgress value={value} className="mt-1.5" />
      </div>
    </div>
  );
}

export default function InsightsScreen() {
  const { data: personality, isPending, isError, refetch } = usePersonality();
  const { data: checkins = [] } = useCheckins();

  if (isPending && !personality) {
    return <InsightsPageSkeleton />;
  }

  if (isError && !personality) {
    return (
      <EmptyState
        icon={<Brain className="h-[17px] w-[17px]" />}
        title="Couldn't load insights"
        description="Please try again in a moment."
        action={{ label: "Try again", onClick: () => void refetch() }}
      />
    );
  }

  const source = personality?.source ?? "insufficient";
  const checkinCount = personality?.checkinCount ?? checkins.length;
  const ocean = personality?.ocean;
  const mbti = personality?.mbti;
  const axes = mbti?.axes;
  const moodPattern =
    personality?.moodPattern && personality.moodPattern.length > 0
      ? personality.moodPattern
      : localMoodPattern(checkins);
  const maxMood = Math.max(1, ...moodPattern.map((m) => m.count));
  const insightCards = personality?.insights?.length ? personality.insights : [];
  const topTrait = ocean
    ? OCEAN_TRAITS.reduce((best, t) =>
        (ocean[t.key] ?? 0) > (ocean[best.key] ?? 0) ? t : best,
      )
    : null;

  const qualityLabel =
    source === "ai"
      ? "From your music, fitness, and check-ins"
      : source === "heuristic"
        ? "A sketch from your check-ins while the full model is offline"
        : checkinCount === 0
          ? "Check in to start a personal read"
          : `Early read · ${checkinCount} check-in${checkinCount === 1 ? "" : "s"}`;

  if (checkinCount === 0 && source !== "ai") {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Insights"
          title="Personality insights"
          subtitle={qualityLabel}
          icon={<Brain className="h-5 w-5" />}
          compact
        />
        <EmptyState
          icon={<Sparkles className="h-[17px] w-[17px]" />}
          title="No check-ins yet"
          description="Log how you feel for a few days. Insights use your moods — we won't invent an MBTI type to fill the page."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Insights"
        title="Personality insights"
        subtitle={qualityLabel}
        icon={<Brain className="h-5 w-5" />}
        compact
        actions={
          <div className="flex flex-wrap gap-1.5">
            <MsPill tone="brand">{checkinCount} check-ins</MsPill>
            {topTrait ? (
              <MsPill tone="neutral">Strongest · {topTrait.short}</MsPill>
            ) : null}
            {moodPattern[0] ? (
              <MsPill tone="neutral">Top mood · {formatMoodLabel(moodPattern[0].label)}</MsPill>
            ) : null}
          </div>
        }
      />

      {source !== "ai" && (
        <p className="rounded-xl border border-ms-line bg-ms-tint px-4 py-3 text-xs leading-relaxed text-ms-ink2 sm:text-sm">
          {source === "insufficient"
            ? "Light trait sketch from your moods. A fuller read needs about five check-ins."
            : "Mood-based sketch — not a clinical profile."}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {ocean && (
          <MsCard elevated className="overflow-hidden">
            <MsCardHeader
              title="Big Five"
              meta={source === "ai" ? "AI + signals" : "From check-ins"}
              icon={<Brain size={16} />}
              compact
            />
            <div className="flex justify-between gap-1 overflow-x-auto border-b border-ms-line bg-ms-tint/40 px-4 py-3 ms-scroll-x sm:px-5">
              {OCEAN_TRAITS.map((trait) => (
                <MiniGauge
                  key={trait.key}
                  value={Math.max(0, Math.min(100, ocean[trait.key] ?? 0))}
                  label={trait.key}
                />
              ))}
            </div>
            <div className="divide-y divide-ms-line px-4 py-1 sm:px-5">
              {OCEAN_TRAITS.map((trait) => (
                <TraitRow
                  key={trait.key}
                  letter={trait.key}
                  name={trait.name}
                  value={Math.max(0, Math.min(100, ocean[trait.key] ?? 0))}
                />
              ))}
            </div>
          </MsCard>
        )}

        {moodPattern.length > 0 && (
          <MsCard elevated className="overflow-hidden">
            <MsCardHeader
              title="Mood mix"
              meta={`${moodPattern.reduce((n, m) => n + m.count, 0)} logged`}
              icon={<Sparkles size={16} />}
              compact
            />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              {moodPattern.slice(0, 5).map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium capitalize text-ms-ink">
                      {formatMoodLabel(row.label)}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-ms-ink3">{row.count}×</span>
                  </div>
                  <MsProgress value={(row.count / maxMood) * 100} />
                </div>
              ))}
            </div>
          </MsCard>
        )}
      </div>

      {mbti?.type && source === "ai" && (
        <MsCard elevated>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ms-line bg-ms-tint/40 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ms-ink3">
                MBTI estimate
              </p>
              <p className="text-3xl font-bold tracking-tight text-ms-ink">{mbti.type}</p>
            </div>
            <MsPill tone="brand">{mbti.confidence}% confidence</MsPill>
          </div>
          {axes && (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {[
                { left: "I", right: "E", value: axes.IE },
                { left: "N", right: "S", value: axes.NS },
                { left: "T", right: "F", value: axes.TF },
                { left: "J", right: "P", value: axes.JP },
              ].map((row) => (
                <div key={row.left} className="rounded-lg border border-ms-line bg-ms-tint/30 px-3 py-2.5">
                  <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-ms-ink3">
                    <span>{row.left}</span>
                    <span>{row.right}</span>
                  </div>
                  <MsProgress value={row.value} />
                </div>
              ))}
            </div>
          )}
        </MsCard>
      )}

      {insightCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insightCards.map((insight, idx) => (
            <MsCard key={`${insight.head}-${idx}`} interactive>
              <div className="border-b border-ms-line bg-ms-soft/50 px-4 py-3">
                <h3 className="text-sm font-semibold text-ms-ink">{insight.head}</h3>
              </div>
              <p className="p-4 text-sm leading-relaxed text-ms-ink2">{insight.body}</p>
            </MsCard>
          ))}
        </div>
      )}

      <p className="text-[11px] text-ms-ink3">
        Estimates from MoodSync data — not a clinical assessment.
      </p>
    </div>
  );
}

function localMoodPattern(checkins: { mood_label?: string; note?: string; mood_labels?: string[] }[]) {
  const counts = new Map<string, number>();
  checkins.forEach((c) => {
    const labels = getCheckinMoods(c)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    labels.forEach((label) => counts.set(label, (counts.get(label) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}
