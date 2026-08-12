import { API_URL } from "./config";

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
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}
