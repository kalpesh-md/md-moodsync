import { API_URL } from "./config";

export interface MoodSyncData {
  error?: string;
  moodScore?: number;
  track?: {
    name: string;
    artist: string;
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
  const res = await fetch(`${API_URL}/mood/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return res.json();
}
