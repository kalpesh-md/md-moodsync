import { API_URL } from "./config";

export interface FriendUser {
  id: string | number;
  username: string;
  last_mood?: string;
}

export interface MoodTrendPoint {
  day: string;
  avg_score: number | string;
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function getFriends(): Promise<FriendUser[]> {
  const res = await fetch(`${API_URL}/friends`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch friends");

  return res.json();
}

export async function getFriendRequests(): Promise<FriendUser[]> {
  const res = await fetch(`${API_URL}/friends/requests`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch friend requests");

  return res.json();
}

export async function acceptFriendRequest(
  followerId: string | number,
): Promise<unknown> {
  const res = await fetch(`${API_URL}/friends/accept/${followerId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error("Failed to accept request");

  return res.json();
}

export async function sendFriendRequest(username: string): Promise<unknown> {
  const res = await fetch(`${API_URL}/friends/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      targetUsername: username,
    }),
  });

  if (!res.ok) throw new Error("Failed to send request");

  return res.json();
}

export async function ignoreFriendRequest(
  followerId: string | number,
): Promise<unknown> {
  const res = await fetch(`${API_URL}/friends/request/${followerId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error("Failed to ignore request");

  return res.json();
}

export async function searchUsers(query: string): Promise<FriendUser[]> {
  const res = await fetch(
    `${API_URL}/users/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );

  if (!res.ok) throw new Error("Search failed");

  return res.json();
}

export async function getFriendMoodTrend(
  friendId: string | number,
): Promise<MoodTrendPoint[]> {
  const res = await fetch(`${API_URL}/friends/${friendId}/mood-trend`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch mood trend");

  return res.json();
}

export async function getPendingRequests(): Promise<FriendUser[]> {
  const res = await fetch(`${API_URL}/friends/pending`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unable to fetch pending requests");
  }

  return res.json();
}
