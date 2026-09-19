import { API_URL } from "./config";
import { fetchWithAuth } from "./http";

export interface User {
  username?: string;
  email?: string;
  share_mood?: boolean;
  share_trends?: boolean;
  share_ocean?: boolean;
  share_music?: boolean;
  share_fitness?: boolean;
  [key: string]: unknown;
}

export async function getMe(): Promise<{ user: User }> {
  const res = await fetchWithAuth(`${API_URL}/auth/me`);
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}
