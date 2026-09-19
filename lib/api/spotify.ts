import { API_URL } from "./config";
import {
  buildSpotifyAuthUrl,
  canBuildSpotifyAuthUrlLocally,
} from "@/lib/spotifyOAuth";

const CONNECT_TIMEOUT_MS = 15_000;

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

async function getSpotifyAuthUrlFromServer(options?: {
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

export async function getSpotifyAuthUrl(options?: {
  switchAccount?: boolean;
}): Promise<{ url: string }> {
  if (canBuildSpotifyAuthUrlLocally()) {
    return { url: buildSpotifyAuthUrl(options) };
  }
  return getSpotifyAuthUrlFromServer(options);
}

export async function connectSpotify(options?: {
  switchAccount?: boolean;
}): Promise<void> {
  const { url } = await getSpotifyAuthUrl(options);
  window.location.href = url;
}

export async function disconnectSpotify(): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/spotify/disconnect`, {
      method: "POST",
      headers: authHeaders(),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Failed to disconnect Spotify");
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function switchSpotifyAccount(): Promise<void> {
  try {
    await disconnectSpotify();
  } catch {
    // Still open Spotify login even if token clear failed.
  }
  await connectSpotify({ switchAccount: true });
}
