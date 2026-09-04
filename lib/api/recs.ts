import { API_URL } from "./config";
import type { EnergyBand } from "@/lib/moodEnergy";

export type RecsStatus =
  | "ok"
  | "spotify_not_connected"
  | "no_history"
  | "token_expired"
  | "error";

export interface RecTrack {
  id: string;
  name: string;
  artists?: { name: string }[];
  album?: { images?: { url: string }[] };
  external_urls?: { spotify?: string };
  energy?: number;
  energy_band?: EnergyBand;
  reason?: string;
  popularity?: number;
}

export interface RecsMood {
  labels: string[];
  energy_band: EnergyBand;
}

export interface RecsResponse {
  recommendations: RecTrack[];
  status: RecsStatus;
  message?: string;
  mood?: RecsMood;
}

export async function getRecs(): Promise<RecsResponse> {
  const res = await fetch(`${API_URL}/recs`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      recommendations: [],
      status: "error",
      message: data.error || "Failed to load recommendations",
    };
  }
  return {
    recommendations: data.recommendations ?? [],
    status: data.status ?? (data.error ? "error" : "ok"),
    message: data.message ?? data.error,
    mood: data.mood,
  };
}
