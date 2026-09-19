import { readCachedUserSession } from "@/lib/userSession";

const SPOTIFY_SCOPES = [
  "user-read-recently-played",
  "user-top-read",
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** User id for Spotify OAuth `state` (must match callback handler). */
export function getSessionUserId(): string | null {
  const cached = readCachedUserSession();
  if (cached?.user_id) return String(cached.user_id);
  if (cached?.id) return String(cached.id);

  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const id = payload?.userId ?? payload?.sub;
  return id ? String(id) : null;
}

export function getSpotifyRedirectUri(): string {
  return `${window.location.origin}/api/spotify/callback`;
}

/** Build Spotify authorize URL in the browser — no server round-trip. */
export function buildSpotifyAuthUrl(options?: { switchAccount?: boolean }): string {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "Spotify client ID is not configured (set NEXT_PUBLIC_SPOTIFY_CLIENT_ID)",
    );
  }

  const userId = getSessionUserId();
  if (!userId) {
    throw new Error("Please sign in again before connecting Spotify");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(),
    scope: SPOTIFY_SCOPES,
    state: userId,
  });

  if (options?.switchAccount) {
    params.set("show_dialog", "true");
  }

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function canBuildSpotifyAuthUrlLocally(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID);
}
