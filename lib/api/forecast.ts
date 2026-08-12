import { API_URL } from "./config";

export interface ForecastItem {
  timeLabel: string;
  predictedMood: string;
  confidence: number;
  doNow?: string[];
  avoid?: string[];
}

export async function getForecast(): Promise<ForecastItem[] | unknown> {
  const res = await fetch(`${API_URL}/forecast`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return res.json();
}
