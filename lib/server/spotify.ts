import { getSupabaseAdmin } from "@/lib/supabase";

export interface SpotifyTrack {
  id: string | null;
  name: string | null;
  artist: string | null;
  albumArt: string | null;
  popularity: number | null;
  isRecent: boolean;
}

interface MoodSyncProfile {
  spotify_access_token?: string | null;
  spotify_refresh_token?: string | null;
  spotify_token_expires?: string | null;
}

function isSpotifyTokenExpired(user: MoodSyncProfile): boolean {
  if (!user?.spotify_access_token) return true;
  if (!user?.spotify_token_expires) return true;
  const exp = new Date(user.spotify_token_expires).getTime();
  if (Number.isNaN(exp)) return true;
  return Date.now() > exp - 60 * 1000;
}

function normalizeSpotifyItem(
  item: {
    id?: string;
    name?: string;
    type?: string;
    show?: { name?: string; images?: { url?: string }[] };
    images?: { url?: string }[];
    artists?: { name?: string }[];
    album?: { images?: { url?: string }[] };
    popularity?: number;
  } | null | undefined,
  isRecent = false,
): SpotifyTrack | null {
  if (!item) return null;
  if (item.type === "episode") {
    return {
      id: item.id || null,
      name: item.name || null,
      artist: item.show?.name || "Podcast",
      albumArt: item.images?.[0]?.url || item.show?.images?.[0]?.url || null,
      popularity: null,
      isRecent,
    };
  }
  return {
    id: item.id || null,
    name: item.name || null,
    artist: item.artists?.[0]?.name || null,
    albumArt: item.album?.images?.[0]?.url || null,
    popularity: typeof item.popularity === "number" ? item.popularity : null,
    isRecent,
  };
}

async function spotifyFetch(url: string, accessToken: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function refreshSpotifyToken(userId: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("moodsync_profiles")
    .select("spotify_refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user?.spotify_refresh_token) {
    console.log("No refresh token available for user:", userId);
    return null;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.spotify_refresh_token,
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!data.access_token) {
    console.log("Failed to refresh token:", data);
    return null;
  }

  const update: Record<string, string> = {
    spotify_access_token: data.access_token,
    spotify_token_expires: new Date(
      Date.now() + (Number(data.expires_in) || 3600) * 1000,
    ).toISOString(),
  };
  if (data.refresh_token) {
    update.spotify_refresh_token = data.refresh_token;
  }

  await db.from("moodsync_profiles").update(update).eq("user_id", userId);

  return data.access_token;
}

export async function ensureSpotifyAccessToken(
  userId: string,
  user: MoodSyncProfile,
): Promise<{ token: string | null; needsReconnect: boolean }> {
  if (!user?.spotify_access_token && !user?.spotify_refresh_token) {
    return { token: null, needsReconnect: false };
  }
  if (!isSpotifyTokenExpired(user) && user.spotify_access_token) {
    return { token: user.spotify_access_token, needsReconnect: false };
  }
  if (!user.spotify_refresh_token) {
    return { token: user.spotify_access_token || null, needsReconnect: true };
  }
  try {
    const refreshed = await refreshSpotifyToken(userId);
    if (refreshed) return { token: refreshed, needsReconnect: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("Spotify refresh failed:", message);
  }
  return {
    token: user.spotify_access_token || null,
    needsReconnect: true,
  };
}

async function fetchSpotifyPlayback(accessToken: string) {
  const playingRes = await spotifyFetch(
    "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode",
    accessToken,
  );
  if (playingRes.status === 401) return { unauthorized: true, track: null };
  if (playingRes.status === 200) {
    const data = await playingRes.json();
    const track = normalizeSpotifyItem(data?.item, false);
    if (track?.name) return { unauthorized: false, track };
  }

  const recentRes = await spotifyFetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    accessToken,
  );
  if (recentRes.status === 401) return { unauthorized: true, track: null };
  if (recentRes.ok) {
    const recentData = await recentRes.json();
    const track = normalizeSpotifyItem(recentData.items?.[0]?.track, true);
    if (track?.name) return { unauthorized: false, track };
  }
  return { unauthorized: false, track: null };
}

export async function getSpotifyPlaybackForUser(
  userId: string,
  user: MoodSyncProfile,
): Promise<{
  track: SpotifyTrack | null;
  token: string | null;
  needsReconnect: boolean;
}> {
  let { token, needsReconnect } = await ensureSpotifyAccessToken(userId, user);
  if (!token) {
    return { track: null, token: null, needsReconnect };
  }

  let playback = await fetchSpotifyPlayback(token);
  if (playback.unauthorized) {
    try {
      const refreshed = await refreshSpotifyToken(userId);
      if (refreshed) {
        token = refreshed;
        needsReconnect = false;
        playback = await fetchSpotifyPlayback(token);
      } else {
        needsReconnect = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("Spotify retry refresh failed:", message);
      needsReconnect = true;
    }
  }
  return {
    track: playback.unauthorized ? null : playback.track,
    token,
    needsReconnect,
  };
}
