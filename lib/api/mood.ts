import { API_URL } from "./config";
import { fetchWithAuth } from "./http";

export interface MoodSyncData {
  error?: string;
  moodScore?: number;
  integrations?: {
    spotify: boolean;
    googleFit: boolean;
    spotifyNeedsReconnect?: boolean;
  };
  track?: {
    name: string | null;
    artist: string | null;
    albumArt?: string | null;
    isRecent?: boolean;
  };
  fitData?: {
    heartRate?: number;
    steps?: number;
    sleepHours?: number;
  };
  audioFeatures?: {
    danceability?: number;
  };
  [key: string]: unknown;
}

export async function syncMood(): Promise<MoodSyncData> {
  const res = await fetchWithAuth(`${API_URL}/mood/sync`, { method: "POST" }, 45_000);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to sync mood");
  return data;
}
