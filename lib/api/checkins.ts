import { API_URL } from "./config";

export interface Checkin {
  created_at: string;
  mood_label?: string;
  mood_labels?: string[];
  display_note?: string;
  note?: string;
  score?: number;
  [key: string]: unknown;
}

interface CreateCheckinData {
  moods: string[];
  note: string;
  shareWithFriends: boolean;
}

export async function getCheckins(): Promise<{ checkins: Checkin[] }> {
  const res = await fetch(`${API_URL}/checkins`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch check-ins");
  return res.json();
}

export async function createCheckin(data: CreateCheckinData): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_URL}/checkins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || "Failed to save check-in");
    }
    return body;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Save timed out — please try again");
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getLatestCheckin(): Promise<{ checkin: Checkin | null }> {
  const res = await fetch(`${API_URL}/checkins/latest`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

export async function getAnalytics(): Promise<unknown> {
  const res = await fetch("/api/checkins/analytics", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return res.json();
}
