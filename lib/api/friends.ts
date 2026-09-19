import { API_URL } from "./config";
import { fetchWithAuth } from "./http";

export interface FriendsSummary {
  friends: FriendUser[];
  requests: FriendUser[];
  pending: FriendUser[];
}

export interface FriendUser {
  id: string | number;
  username: string;
  last_mood?: string;
}

export interface MoodTrendPoint {
  day: string;
  avg_score: number | string;
}

export async function getFriendsSummary(): Promise<FriendsSummary> {
  const res = await fetchWithAuth(`${API_URL}/friends/summary`);
  if (!res.ok) throw new Error("Failed to fetch friends");
  return res.json();
}

export async function acceptFriendRequest(
  followerId: string | number,
): Promise<unknown> {
  const res = await fetchWithAuth(`${API_URL}/friends/accept/${followerId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to accept request");
  return res.json();
}

export async function sendFriendRequest(username: string): Promise<unknown> {
  const res = await fetchWithAuth(`${API_URL}/friends/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUsername: username }),
  });
  if (!res.ok) throw new Error("Failed to send request");
  return res.json();
}

export async function ignoreFriendRequest(
  followerId: string | number,
): Promise<unknown> {
  const res = await fetchWithAuth(`${API_URL}/friends/request/${followerId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to ignore request");
  return res.json();
}

export async function searchUsers(query: string): Promise<FriendUser[]> {
  const res = await fetchWithAuth(
    `${API_URL}/users/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function getFriendMoodTrend(
  friendId: string | number,
): Promise<MoodTrendPoint[]> {
  const res = await fetchWithAuth(`${API_URL}/friends/${friendId}/mood-trend`);
  if (!res.ok) throw new Error("Failed to fetch mood trend");
  return res.json();
}
