import { API_URL } from "./config";

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

export async function getSpotifyAuthUrl(options?: {
  switchAccount?: boolean;
}): Promise<{ url: string }> {
  const qs = options?.switchAccount ? "?switch=1" : "";
  const res = await fetch(`${API_URL}/spotify/auth-url${qs}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function connectSpotify(options?: {
  switchAccount?: boolean;
}): Promise<void> {
  const { url } = await getSpotifyAuthUrl(options);
  if (!url) return;
  window.location.href = url;
}

export async function disconnectSpotify(): Promise<void> {
  const res = await fetch(`${API_URL}/spotify/disconnect`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to disconnect Spotify");
}

export async function switchSpotifyAccount(): Promise<void> {
  await disconnectSpotify();
  await connectSpotify({ switchAccount: true });
}
