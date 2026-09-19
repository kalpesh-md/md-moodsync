export const MOCK_FORECAST = [
  {
    timeLabel: "Next 2 hours",
    predictedMood: "Focused",
    confidence: 75,
    doNow: ["Take a short break", "Stay hydrated", "Tackle one priority task"],
    avoid: ["Multitasking", "Heavy caffeine"],
  },
  {
    timeLabel: "Tonight (7-10pm)",
    predictedMood: "Calm",
    confidence: 70,
    doNow: ["Wind down with music", "Light stretching", "Plan tomorrow lightly"],
    avoid: ["Stressful emails", "Late caffeine"],
  },
  {
    timeLabel: "Tomorrow Morning (8-11am)",
    predictedMood: "Energetic",
    confidence: 80,
    doNow: ["Plan your top 3 tasks", "Get morning sunlight", "Eat a balanced breakfast"],
    avoid: ["Skipping breakfast", "Diving into notifications first"],
  },
];

export interface ForecastItem {
  timeLabel: string;
  predictedMood: string;
  confidence: number;
  doNow: string[];
  avoid: string[];
}

export function normalizeForecastItems(data: unknown): ForecastItem[] | null {
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as { forecast?: unknown[] })?.forecast)
      ? (data as { forecast: unknown[] }).forecast
      : null;

  if (!raw?.length) return null;

  const normalized = raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        timeLabel: String(row?.timeLabel || row?.time || "Upcoming"),
        predictedMood: String(row?.predictedMood || row?.mood || "Balanced"),
        confidence: Math.min(
          100,
          Math.max(0, Number(row?.confidence ?? 60) || 60),
        ),
        doNow: Array.isArray(row?.doNow)
          ? row.doNow.map(String)
          : ["Take a mindful pause"],
        avoid: Array.isArray(row?.avoid)
          ? row.avoid.map(String)
          : ["Overcommitting"],
      };
    })
    .filter((item) => item.timeLabel && item.predictedMood);

  return normalized.length > 0 ? normalized.slice(0, 3) : null;
}
