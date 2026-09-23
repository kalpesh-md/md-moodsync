function moodLabelToScore(label: string): number {
  const map: Record<string, number> = {
    excited: 90,
    Excited: 90,
    happy: 85,
    Happy: 85,
    grateful: 80,
    Grateful: 80,
    focused: 70,
    Focused: 70,
    calm: 65,
    Calm: 65,
    tired: 35,
    Tired: 35,
    anxious: 25,
    Anxious: 25,
    sad: 20,
    Sad: 20,
    low: 20,
    Low: 20,
    stressed: 15,
    Stressed: 15,
  };
  return map[label] ?? map[String(label || "").toLowerCase()] ?? 50;
}

function moodsLabelToScore(label: string | null | undefined): number | null {
  if (!label) return null;
  const parts = String(label)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const scores = parts.map((part) => moodLabelToScore(part));
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

export function computeMoodScore({
  moodLabel,
  trackPopularity,
  steps,
  sleepHours,
}: {
  moodLabel: string | null;
  trackPopularity: number | null;
  steps: number;
  sleepHours?: number | null;
}): number {
  const components: { value: number; weight: number }[] = [];

  const moodScore = moodsLabelToScore(moodLabel);
  if (moodScore != null) {
    components.push({ value: moodScore, weight: 0.5 });
  }
  if (typeof trackPopularity === "number") {
    components.push({ value: trackPopularity, weight: 0.2 });
  }
  if (typeof steps === "number" && steps > 0) {
    components.push({
      value: Math.round(Math.min(steps / 10000, 1) * 100),
      weight: 0.15,
    });
  }
  if (typeof sleepHours === "number" && sleepHours > 0) {
    // 7–9 hours is optimal; short or very long sleep lowers the score.
    const distanceFromIdeal = Math.min(Math.abs(sleepHours - 8) / 4, 1);
    components.push({
      value: Math.round((1 - distanceFromIdeal) * 100),
      weight: 0.15,
    });
  }

  if (components.length === 0) return 50;

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weighted = components.reduce((s, c) => s + c.value * c.weight, 0);
  return Math.round(weighted / totalWeight);
}
