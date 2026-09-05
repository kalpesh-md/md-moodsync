"use client";

import { Brain, Sparkles } from "lucide-react";
import { InsightsPageSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { MsCard, MsCardHeader } from "@/components/ui/ms/MsCard";
import { MsPill } from "@/components/ui/ms/MsPill";
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
      <div className="space-y-5">
        <PageHeader qualityLabel={qualityLabel} />
        <EmptyState
          icon={<Sparkles className="h-[17px] w-[17px]" />}
          title="No check-ins yet"
          description="Log how you feel for a few days. Insights use your moods — we won't invent an MBTI type to fill the page."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader qualityLabel={qualityLabel} />

      {source !== "ai" && (
        <p className="rounded-xl border border-ms-line bg-ms-tint px-3 py-2 text-xs text-ms-ink2">
          {source === "insufficient"
            ? "We show a light trait sketch from your moods. A fuller personality read — including MBTI — needs about five check-ins."
            : "This is a mood-based sketch, not a clinical profile. We skip MBTI rather than invent a type."}
        </p>
      )}

      {moodPattern.length > 0 && (
        <MsCard>
          <MsCardHeader
            title="Mood mix"
            meta="From your logged check-ins"
            icon={<Sparkles size={16} />}
          />
          <div className="space-y-3 p-5 pt-0">
            {moodPattern.slice(0, 6).map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize text-ms-ink">
                    {formatMoodLabel(row.label)}
                  </span>
                  <span className="text-xs text-ms-ink3">{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ms-soft">
                  <div
                    className="h-full rounded-full bg-ms-navy"
                    style={{ width: `${Math.round((row.count / maxMood) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </MsCard>
      )}

      {mbti?.type && source === "ai" && (
        <MsCard>
          <div className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs text-ms-ink3">MBTI estimate</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-ms-ink">{mbti.type}</p>
            </div>
            <MsPill tone="brand">{mbti.confidence}% confidence</MsPill>
          </div>
          {axes && (
            <div className="space-y-3 border-t border-ms-line px-5 pb-5 pt-4">
              {[
                { left: "I", right: "E", value: axes.IE },
                { left: "N", right: "S", value: axes.NS },
                { left: "T", right: "F", value: axes.TF },
                { left: "J", right: "P", value: axes.JP },
              ].map((row) => (
                <div key={row.left} className="flex items-center gap-3 text-xs font-medium">
                  <span className="w-4 text-ms-ink3">{row.left}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ms-soft">
                    <div
                      className="h-full rounded-full bg-ms-navy"
                      style={{ width: `${row.value}%` }}
                    />
                  </div>
                  <span className="w-4 text-right text-ms-ink3">{row.right}</span>
                </div>
              ))}
            </div>
          )}
        </MsCard>
      )}

      {ocean && (
        <MsCard>
          <MsCardHeader
            title="Big Five traits"
            meta={
              source === "ai"
                ? "Inferred from listening, fitness, and moods"
                : "Estimated from the moods you log"
            }
            icon={<Brain size={16} />}
          />
          <div className="space-y-5 p-5 pt-0">
            {OCEAN_TRAITS.map((trait) => {
              const value = Math.max(0, Math.min(100, ocean[trait.key] ?? 0));
              return (
                <div key={trait.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MsPill tone="brand">{trait.key}</MsPill>
                      <span className="text-sm font-medium text-ms-ink">{trait.name}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-ms-navy">
                      {value}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ms-soft">
                    <div
                      className="h-full rounded-full bg-ms-navy transition-all"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <p className="text-xs text-ms-ink3">{trait.description}</p>
                </div>
              );
            })}
          </div>
        </MsCard>
      )}

      {insightCards.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {insightCards.map((insight, idx) => (
            <MsCard key={`${insight.head}-${idx}`}>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-ms-ink">{insight.head}</h3>
                <p className="mt-2 text-sm text-ms-ink2">{insight.body}</p>
              </div>
            </MsCard>
          ))}
        </div>
      )}

      <p className="text-xs text-ms-ink3">
        Insights are estimates from MoodSync data, not a clinical assessment.
      </p>
    </div>
  );
}

function PageHeader({ qualityLabel }: { qualityLabel: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ms-soft text-ms-navy">
        <Brain className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ms-ink">
          Personality insights
        </h2>
        <p className="text-sm text-ms-ink2">{qualityLabel}</p>
      </div>
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
