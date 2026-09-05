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
  {
    key: "O" as const,
    name: "Openness",
    description: "Curiosity, creativity, open to new experiences",
  },
  {
    key: "C" as const,
    name: "Conscientiousness",
    description: "Organization, dependability, discipline",
  },
  {
    key: "E" as const,
    name: "Extraversion",
    description: "Sociability, energy, assertiveness",
  },
  {
    key: "A" as const,
    name: "Agreeableness",
    description: "Compassion, cooperation, trust",
  },
  {
    key: "N" as const,
    name: "Neuroticism",
    description: "Emotional sensitivity, anxiety, mood",
  },
];

function TraitGauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const dash = 2 * Math.PI * 36;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 88 88" className="h-20 w-20 -rotate-90">
          <circle cx="44" cy="44" r="36" fill="none" className="stroke-ms-soft" strokeWidth="7" />
          <circle
            cx="44"
            cy="44"
            r="36"
            fill="none"
            className="stroke-ms-navy"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={dash * (1 - clamped / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none text-ms-ink">{clamped}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-ms-ink3">
            {label}
          </span>
        </div>
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
      <div className="space-y-6">
        <PageHeader
          eyebrow="Insights"
          title="Personality insights"
          subtitle={qualityLabel}
          icon={<Brain className="h-5 w-5" />}
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Personality insights"
        subtitle={qualityLabel}
        icon={<Brain className="h-5 w-5" />}
      />

      {source !== "ai" && (
        <div className="rounded-2xl border border-ms-line bg-ms-tint px-5 py-4 text-sm leading-relaxed text-ms-ink2">
          {source === "insufficient"
            ? "We show a light trait sketch from your moods. A fuller personality read — including MBTI — needs about five check-ins."
            : "This is a mood-based sketch, not a clinical profile. We skip MBTI rather than invent a type."}
        </div>
      )}

      {ocean && (
        <MsCard elevated>
          <MsCardHeader
            title="Big Five traits"
            meta={
              source === "ai"
                ? "Inferred from listening, fitness, and moods"
                : "Estimated from the moods you log"
            }
            icon={<Brain size={16} />}
          />
          <div className="grid grid-cols-2 gap-3 border-b border-ms-line bg-ms-tint/30 p-6 sm:grid-cols-5">
            {OCEAN_TRAITS.map((trait) => (
              <TraitGauge
                key={trait.key}
                value={Math.max(0, Math.min(100, ocean[trait.key] ?? 0))}
                label={trait.key}
              />
            ))}
          </div>
          <div className="space-y-4 p-6">
            {OCEAN_TRAITS.map((trait) => {
              const value = Math.max(0, Math.min(100, ocean[trait.key] ?? 0));
              return (
                <div
                  key={trait.key}
                  className="rounded-xl border border-ms-line bg-ms-tint/40 px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MsPill tone="brand">{trait.key}</MsPill>
                        <span className="text-sm font-semibold text-ms-ink">{trait.name}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-ms-ink2">
                        {trait.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-2xl font-bold tabular-nums text-ms-navy">
                      {value}
                    </span>
                  </div>
                  <div className="mt-4">
                    <MsProgress value={value} size="md" />
                  </div>
                </div>
              );
            })}
          </div>
        </MsCard>
      )}

      {moodPattern.length > 0 && (
        <MsCard elevated>
          <MsCardHeader
            title="Mood mix"
            meta="From your logged check-ins"
            icon={<Sparkles size={16} />}
          />
          <div className="space-y-4 p-6">
            {moodPattern.slice(0, 6).map((row) => (
              <div key={row.label} className="rounded-xl border border-ms-line bg-ms-tint/40 px-5 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold capitalize text-ms-ink">
                    {formatMoodLabel(row.label)}
                  </span>
                  <MsPill tone="neutral">{row.count} check-ins</MsPill>
                </div>
                <MsProgress value={(row.count / maxMood) * 100} size="md" />
              </div>
            ))}
          </div>
        </MsCard>
      )}

      {mbti?.type && source === "ai" && (
        <MsCard elevated>
          <div className="flex items-start justify-between gap-3 border-b border-ms-line bg-ms-tint/40 px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ms-ink3">
                MBTI estimate
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-ms-ink">{mbti.type}</p>
            </div>
            <MsPill tone="brand">{mbti.confidence}% confidence</MsPill>
          </div>
          {axes && (
            <div className="space-y-5 p-6">
              {[
                { left: "I", right: "E", value: axes.IE },
                { left: "N", right: "S", value: axes.NS },
                { left: "T", right: "F", value: axes.TF },
                { left: "J", right: "P", value: axes.JP },
              ].map((row) => (
                <div
                  key={row.left}
                  className="rounded-xl border border-ms-line bg-ms-tint/40 px-5 py-4"
                >
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ms-ink3">
                    <span>{row.left}</span>
                    <span>{row.right}</span>
                  </div>
                  <MsProgress value={row.value} size="md" />
                </div>
              ))}
            </div>
          )}
        </MsCard>
      )}

      {insightCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {insightCards.map((insight, idx) => (
            <MsCard key={`${insight.head}-${idx}`} interactive>
              <div className="border-b border-ms-line bg-ms-tint/30 px-5 py-4">
                <h3 className="text-sm font-semibold text-ms-ink">{insight.head}</h3>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-ms-ink2">{insight.body}</p>
              </div>
            </MsCard>
          ))}
        </div>
      )}

      <p className="px-1 text-xs leading-relaxed text-ms-ink3">
        Insights are estimates from MoodSync data, not a clinical assessment.
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
