import { API_URL } from "./config";

const CONNECT_TIMEOUT_MS = 12_000;

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

export async function getSpotifyAuthUrl(options?: {
  switchAccount?: boolean;
}): Promise<{ url: string }> {
  const qs = options?.switchAccount ? "?switch=1" : "";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/spotify/auth-url${qs}`, {
      headers: authHeaders(),
      signal: controller.signal,
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) {
      throw new Error(data.error || "Could not start Spotify connect");
    }
    if (!data.url) {
      throw new Error("Spotify connect URL was missing");
    }
    return { url: data.url };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Spotify connect timed out — please try again");
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function connectSpotify(options?: {
  switchAccount?: boolean;
}): Promise<void> {
  const { url } = await getSpotifyAuthUrl(options);
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
