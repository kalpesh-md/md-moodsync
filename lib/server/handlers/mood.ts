import { getCheckinMoods } from "@/lib/checkinMoods";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchGoogleFitData } from "@/lib/server/googleFit";
import { requireAuth, type RouteHandler } from "@/lib/server/http";
import { computeMoodScore } from "@/lib/server/moodScore";
import { getSpotifyPlaybackForUser } from "@/lib/server/spotify";

export const postMoodSync: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;
  const db = getSupabaseAdmin();

  const { data: user } = await db
    .from("moodsync_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  let spotifyTrack = null;
  let spotifyNeedsReconnect = false;
  if (user.spotify_access_token || user.spotify_refresh_token) {
    try {
      const playback = await getSpotifyPlaybackForUser(userId, user);
      spotifyTrack = playback.track;
      spotifyNeedsReconnect = Boolean(playback.needsReconnect);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("Spotify playback fetch failed:", message);
    }
  }

  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  let fitData = { steps: 0, heartRate: null as number | null, sleepHours: null as null };

  if (user.google_access_token) {
    fitData = await fetchGoogleFitData(user.google_access_token, startOfDay, now);
  }

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data: recentCheckins } = await db
    .from("mood_checkins")
    .select("mood_label, note, mood_labels")
    .eq("user_id", userId)
    .gte("created_at", threeHoursAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  const recentCheckin = recentCheckins?.[0];

  const moodScore = computeMoodScore({
    moodLabel: recentCheckin ? getCheckinMoods(recentCheckin) || null : null,
    trackPopularity: spotifyTrack?.popularity ?? null,
    steps: fitData.steps,
  });

  const { data: lastSnapshots } = await db
    .from("mood_snapshots")
    .select("id, track_id, track_name, artist_name, album_art, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastSnapshot = lastSnapshots?.[0];
  let trackId = spotifyTrack?.id || null;
  let trackName = spotifyTrack?.name || null;
  let artistName = spotifyTrack?.artist || null;
  let albumArt = spotifyTrack?.albumArt || null;
  let isRecent = Boolean(spotifyTrack?.isRecent);

  if (!trackName && lastSnapshot?.track_name) {
    trackId = lastSnapshot.track_id || null;
    trackName = lastSnapshot.track_name;
    artistName = lastSnapshot.artist_name || null;
    albumArt = lastSnapshot.album_art || null;
    isRecent = true;
  }

  const sameTrack = lastSnapshot?.track_id === trackId;
  const secondsSinceLast = lastSnapshot
    ? (Date.now() - new Date(lastSnapshot.created_at).getTime()) / 1000
    : Infinity;

  const shouldSkipInsert = sameTrack && secondsSinceLast < 300;

  const snapshotFields = {
    score: moodScore,
    valence: null,
    energy: null,
    steps: fitData.steps,
    heart_rate: fitData.heartRate,
    sleep_hours: fitData.sleepHours,
    track_id: trackId,
    track_name: trackName,
    artist_name: artistName,
    album_art: albumArt,
  };

  if (shouldSkipInsert && lastSnapshot?.id) {
    await db.from("mood_snapshots").update(snapshotFields).eq("id", lastSnapshot.id);
  } else {
    await db.from("mood_snapshots").insert({
      user_id: userId,
      created_at: new Date().toISOString(),
      ...snapshotFields,
    });
  }

  return Response.json({
    moodScore,
    integrations: {
      spotify: Boolean(user.spotify_access_token || user.spotify_refresh_token),
      googleFit: Boolean(user.google_access_token),
      spotifyNeedsReconnect,
    },
    track: {
      name: trackName,
      artist: artistName,
      albumArt,
      isRecent,
    },
    fitData,
  });
};

export const getMoodSnapshots: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;
  const db = getSupabaseAdmin();

  const { data: snapshots } = await db
    .from("mood_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: latest } = await db
    .from("mood_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  console.log("Latest snapshot:");
  console.log(latest?.[0]);
  return Response.json({ snapshots: snapshots || [] });
};
