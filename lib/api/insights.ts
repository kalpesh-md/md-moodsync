import { API_URL } from "./config";

export interface OceanScores {
  O: number;
  C: number;
  E: number;
  A: number;
  N: number;
}

export interface MbtiAxes {
  IE: number;
  NS: number;
  TF: number;
  JP: number;
}

export interface PersonalityInsight {
  head: string;
  body: string;
  color?: string;
}

export interface PersonalityData {
  source?: "ai" | "heuristic" | "insufficient";
  checkinCount?: number;
  snapshotCount?: number;
  moodPattern?: { label: string; count: number }[];
  ocean?: OceanScores | null;
  mbti?: {
    type: string;
    confidence: number;
    axes?: MbtiAxes;
  } | null;
  insights?: PersonalityInsight[];
}

export async function getPersonality(): Promise<PersonalityData> {
  const res = await fetch(`${API_URL}/insights/personality`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to load personality insights");
  }
  return res.json();
}
