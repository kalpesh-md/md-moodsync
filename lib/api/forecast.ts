import { API_URL } from "./config";

export interface ForecastItem {
  timeLabel: string;
  predictedMood: string;
  confidence: number;
  doNow?: string[];
  avoid?: string[];
}

export interface ForecastResponse {
  forecast: ForecastItem[];
  source?: "ai" | "mock" | "cache" | "fallback";
}

const FALLBACK_FORECAST: ForecastItem[] = [
  {
    timeLabel: "Next 2 hours",
    predictedMood: "Focused",
    confidence: 75,
    doNow: ["Take a short break", "Stay hydrated"],
    avoid: ["Multitasking"],
  },
  {
    timeLabel: "Tonight (7-10pm)",
    predictedMood: "Calm",
    confidence: 70,
    doNow: ["Wind down with music", "Light stretching"],
    avoid: ["Late caffeine"],
  },
  {
    timeLabel: "Tomorrow Morning (8-11am)",
    predictedMood: "Energetic",
    confidence: 80,
    doNow: ["Plan your top 3 tasks", "Get morning sunlight"],
    avoid: ["Skipping breakfast"],
  },
];

function parseForecastPayload(data: unknown): ForecastResponse | null {
  if (Array.isArray(data) && data.length > 0) {
    return { forecast: data as ForecastItem[], source: "ai" };
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as ForecastResponse).forecast) &&
    (data as ForecastResponse).forecast.length > 0
  ) {
    const parsed = data as ForecastResponse;
    return { forecast: parsed.forecast, source: parsed.source ?? "ai" };
  }
  return null;
}

export async function getForecast(): Promise<ForecastResponse> {
  try {
    const res = await fetch(`${API_URL}/forecast`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json().catch(() => null);
    const parsed = parseForecastPayload(data);

    if (parsed) return parsed;

    if (!res.ok) {
      return { forecast: FALLBACK_FORECAST, source: "fallback" };
    }

    return { forecast: FALLBACK_FORECAST, source: "mock" };
  } catch {
    return { forecast: FALLBACK_FORECAST, source: "fallback" };
  }
}
