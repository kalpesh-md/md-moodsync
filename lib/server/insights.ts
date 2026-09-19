import { enrichCheckin } from "@/lib/checkinMoods";

export function aggregateFeatures(
  snapshots: { valence?: number; energy?: number; steps?: number }[],
) {
  if (!snapshots.length) return {};
  const avg = (key: "valence" | "energy" | "steps") =>
    snapshots.reduce((s, r) => s + (r[key] || 0), 0) / snapshots.length;
  return {
    valence: avg("valence").toFixed(2),
    energy: avg("energy").toFixed(2),
    steps: Math.round(avg("steps")),
  };
}

export function moodDistribution(
  checkins: { mood_label?: string; note?: string; mood_labels?: string[] }[],
) {
  return (checkins || []).reduce<Record<string, number>>((acc, c) => {
    const enriched = enrichCheckin(c);
    const labels = enriched.mood_labels?.length
      ? enriched.mood_labels
      : enriched.mood_label
        ? [enriched.mood_label]
        : [];
    labels.forEach((raw) => {
      const key = String(raw).trim().toLowerCase();
      if (!key) return;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
}

export function moodPatternFromDist(dist: Record<string, number>) {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

export function heuristicOcean(dist: Record<string, number>) {
  const total = Object.values(dist).reduce((sum, n) => sum + n, 0) || 1;
  const share = (key: string) => (dist[key] || 0) / total;
  const clamp = (n: number) => Math.max(8, Math.min(92, Math.round(n)));
  return {
    O: clamp(48 + share("excited") * 30 + share("happy") * 10),
    C: clamp(50 + share("focused") * 35 - share("tired") * 12),
    E: clamp(
      45 +
        (share("happy") + share("excited")) * 30 -
        (share("calm") + share("low")) * 15,
    ),
    A: clamp(50 + share("calm") * 25 - share("stressed") * 15),
    N: clamp(35 + (share("anxious") + share("stressed") + share("low")) * 40),
  };
}

export function fitnessPatterns(
  snapshots: { created_at: string; score?: number }[],
) {
  const byHour: Record<string, number[]> = {};
  snapshots.forEach((s) => {
    const h = new Date(s.created_at).getHours();
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(s.score ?? 0);
  });
  return Object.fromEntries(
    Object.entries(byHour).map(([h, scores]) => [
      h,
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    ]),
  );
}
