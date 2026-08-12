import { API_URL } from "./config";

export interface Checkin {
  created_at: string;
  mood_label?: string;
  note?: string;
  score?: number;
  [key: string]: unknown;
}

interface CreateCheckinData {
  mood: string;
  note: string;
  shareWithFriends: boolean;
}

export async function getCheckins(): Promise<{ checkins: Checkin[] }> {
  const res = await fetch(`${API_URL}/checkins`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

export async function createCheckin(data: CreateCheckinData): Promise<unknown> {
  const res = await fetch(`${API_URL}/checkins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
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
