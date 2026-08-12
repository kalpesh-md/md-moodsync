import { API_URL } from "./config";

export interface PrivacySettings {
  mood: boolean;
  trends: boolean;
  ocean: boolean;
  music: boolean;
  fitness: boolean;
}

interface PrivacyUpdatePayload {
  share_mood: boolean;
  share_trends: boolean;
  share_ocean: boolean;
  share_music: boolean;
  share_fitness: boolean;
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function updatePrivacy(
  settings: PrivacyUpdatePayload,
): Promise<unknown> {
  const res = await fetch(`${API_URL}/privacy`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    throw new Error("Failed to update privacy");
  }

  return res.json();
}

export async function getPrivacy(): Promise<PrivacySettings> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load privacy");
  }

  const data = await res.json();

  return {
    mood: data.user.share_mood,
    trends: data.user.share_trends,
    ocean: data.user.share_ocean,
    music: data.user.share_music,
    fitness: data.user.share_fitness,
  };
}
