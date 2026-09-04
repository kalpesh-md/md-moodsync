"use client";

import { Brain, Sparkles } from "lucide-react";
import { InsightsPageSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCheckins, usePersonality } from "@/lib/hooks/queries";
import { getCheckinMoods } from "@/lib/checkinMoods";
import { formatMoodLabel, cn } from "@/lib/utils";

const OCEAN_TRAITS = [
  {
    key: "O" as const,
    name: "Openness",
    description: "Curiosity, creativity, open to new experiences",
    bar: "bg-indigo-500",
  },
  {
    key: "C" as const,
    name: "Conscientiousness",
    description: "Organization, dependability, discipline",
    bar: "bg-sky-600",
  },
  {
    key: "E" as const,
    name: "Extraversion",
    description: "Sociability, energy, assertiveness",
    bar: "bg-amber-500",
  },
  {
    key: "A" as const,
    name: "Agreeableness",
    description: "Compassion, cooperation, trust",
    bar: "bg-emerald-500",
  },
  {
    key: "N" as const,
    name: "Neuroticism",
    description: "Emotional sensitivity, anxiety, mood",
    bar: "bg-rose-500",
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
        icon={<Brain className="h-7 w-7 text-slate-400" />}
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
  const insightCards = personality?.insights?.length
    ? personality.insights
    : [];

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
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9EEF5] text-navy dark:bg-slate-700 dark:text-slate-100">
            <Brain className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
              Personality insights
            </h2>
            <p className="text-sm text-muted-foreground">{qualityLabel}</p>
          </div>
        </div>
        <EmptyState
          icon={<Sparkles className="h-7 w-7 text-[#378ADD]" />}
          title="No check-ins yet"
          description="Log how you feel for a few days. Insights use your moods — we won't invent an MBTI type to fill the page."
          variant="muted"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9EEF5] text-navy dark:bg-slate-700 dark:text-slate-100">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
            Personality insights
          </h2>
          <p className="text-sm text-muted-foreground">{qualityLabel}</p>
        </div>
      </div>

      {source !== "ai" && (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {source === "insufficient"
            ? "We show a light trait sketch from your moods. A fuller personality read — including MBTI — needs about five check-ins."
            : "This is a mood-based sketch, not a clinical profile. We skip MBTI rather than invent a type."}
        </p>
      )}

      {moodPattern.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-navy" />
              Mood mix
            </CardTitle>
            <CardDescription>From your logged check-ins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moodPattern.slice(0, 6).map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">
                    {formatMoodLabel(row.label)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-navy"
                    style={{ width: `${Math.round((row.count / maxMood) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {mbti?.type && source === "ai" && (
        <Card className="border-navy/15 bg-[#F7F8FA] dark:bg-slate-800">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardDescription>MBTI estimate</CardDescription>
              <CardTitle className="mt-1 text-3xl tracking-tight text-navy dark:text-slate-100">
                {mbti.type}
              </CardTitle>
            </div>
            <Badge variant="secondary">{mbti.confidence}% confidence</Badge>
          </CardHeader>
          {axes && (
            <CardContent className="space-y-3">
              {[
                { left: "I", right: "E", value: axes.IE },
                { left: "N", right: "S", value: axes.NS },
                { left: "T", right: "F", value: axes.TF },
                { left: "J", right: "P", value: axes.JP },
              ].map((row) => (
                <div key={row.left} className="flex items-center gap-3 text-xs font-medium">
                  <span className="w-4 text-muted-foreground">{row.left}</span>
                  <Progress value={row.value} className="h-2 flex-1" />
                  <span className="w-4 text-right text-muted-foreground">{row.right}</span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {ocean && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-navy" />
              Big Five traits
            </CardTitle>
            <CardDescription>
              {source === "ai"
                ? "Inferred from listening, fitness, and moods"
                : "Estimated from the moods you log"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {OCEAN_TRAITS.map((trait) => {
              const value = Math.max(0, Math.min(100, ocean[trait.key] ?? 0));
              return (
                <div key={trait.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-navy hover:bg-navy">{trait.key}</Badge>
                      <span className="text-sm font-medium">{trait.name}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-navy dark:text-slate-200">
                      {value}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={cn("h-full rounded-full transition-all", trait.bar)}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{trait.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {insightCards.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {insightCards.map((insight, idx) => (
            <Card key={`${insight.head}-${idx}`} className="bg-[#F4F6FA] dark:bg-slate-800/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{insight.head}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
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
