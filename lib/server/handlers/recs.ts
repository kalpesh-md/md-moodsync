import { enrichCheckin } from "@/lib/checkinMoods";
import {
  energyBand,
  energyFromMoods,
  estimateTrackEnergy,
  reasonForTrack,
} from "@/lib/moodEnergy";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth, type RouteHandler } from "@/lib/server/http";
import {
  ensureSpotifyAccessToken,
  refreshSpotifyToken,
} from "@/lib/server/spotify";

export const getRecs: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  try {
    const db = getSupabaseAdmin();
    const { data: user, error: profileErr } = await db
      .from("moodsync_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr) throw profileErr;

    if (!user?.spotify_access_token && !user?.spotify_refresh_token) {
      return Response.json({
        recommendations: [],
        status: "spotify_not_connected",
        message: "Connect Spotify to see music picked for your mood.",
      });
    }

    let accessToken = user.spotify_access_token;
    const ensured = await ensureSpotifyAccessToken(userId, user);
    accessToken = ensured.token;
    if (ensured.needsReconnect && !accessToken) {
      return Response.json({
        recommendations: [],
        status: "token_expired",
        message: "Your Spotify session expired. Reconnect to refresh recommendations.",
      });
    }

    let topTracks: { items?: unknown[] } = { items: [] };
    let topRes = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (topRes.status === 401) {
      const refreshed = await refreshSpotifyToken(userId);
      if (refreshed) {
        accessToken = refreshed;
        topRes = await fetch(
          "https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term",
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
      }
    }
    if (topRes.status === 401) {
      return Response.json({
        recommendations: [],
        status: "token_expired",
        message: "Your Spotify session expired. Reconnect to refresh recommendations.",
      });
    }
    if (topRes.ok) topTracks = await topRes.json();

    let recentTracks: { items?: { track?: unknown }[] } = { items: [] };
    const recentRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=20",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (recentRes.ok) recentTracks = await recentRes.json();

    const combined = [
      ...(topTracks.items || []),
      ...(recentTracks.items?.map((i) => i.track) || []),
    ] as {
      id?: string;
      name?: string;
      artists?: unknown[];
      album?: unknown;
      external_urls?: unknown;
      popularity?: number;
    }[];

    const seen = new Set<string>();
    const deduped = combined.filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    if (deduped.length === 0) {
      return Response.json({
        recommendations: [],
        status: "no_history",
        message:
          "No listening history yet. Play a few tracks on Spotify and check back — we'll learn your taste quickly.",
      });
    }

    const shuffled = deduped.sort(() => Math.random() - 0.5).slice(0, 12);

    const { data: latestCheckin } = await db
      .from("mood_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latest = latestCheckin ? enrichCheckin(latestCheckin) : null;
    const moods = latest?.mood_labels?.length
      ? latest.mood_labels
      : latest?.mood_label
        ? [latest.mood_label]
        : [];
    const prefer = energyFromMoods(moods);
    const rank = (band: string) => (band === prefer ? 0 : band === "medium" ? 1 : 2);

    const recommendations = shuffled
      .map((track) => {
        const energy = estimateTrackEnergy(track, prefer);
        const band = energyBand(energy);
        return {
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          external_urls: track.external_urls,
          popularity: track.popularity,
          energy,
          energy_band: band,
          reason: "",
        };
      })
      .sort((a, b) => rank(a.energy_band) - rank(b.energy_band))
      .map((track, index) => ({
        ...track,
        reason: reasonForTrack(moods, track.energy_band, index === 0),
      }));

    return Response.json({
      recommendations,
      status: "ok",
      mood: {
        labels: moods,
        energy_band: prefer,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("Recs route error:", message);
    return Response.json({
      recommendations: [],
      status: "error",
      message: "We couldn't reach Spotify right now. Please try again.",
    });
  }
};
