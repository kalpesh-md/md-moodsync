import {
  encodeCheckinNote,
  enrichCheckin,
} from "@/lib/checkinMoods";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readJsonBody, requireAuth, type RouteHandler } from "@/lib/server/http";

function toMoodEnum(mood: unknown): string {
  if (mood == null || mood === "") return String(mood);
  return String(mood).trim().toLowerCase();
}

export const postCheckins: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { mood, moods, note, shareWithFriends } = await readJsonBody<{
    mood?: string;
    moods?: string[];
    note?: string;
    shareWithFriends?: boolean;
  }>(request);

  const db = getSupabaseAdmin();
  const moodList = Array.isArray(moods) ? moods : mood ? [mood] : [];
  const normalizedMoods = moodList.map(toMoodEnum).filter(Boolean);

  if (normalizedMoods.length === 0) {
    return Response.json({ error: "At least one mood is required" }, { status: 400 });
  }

  const primaryMood = normalizedMoods[0];
  const finalNote = encodeCheckinNote(normalizedMoods, note || "");

  const payload = {
    user_id: auth.user.userId,
    mood_label: primaryMood,
    note: finalNote,
    share_with_friends: shareWithFriends,
  };

  try {
    const { data, error } = await db
      .from("mood_checkins")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ checkin: enrichCheckin(data) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("checkin save error:", message);
    return Response.json({ error: "Failed to save checkin" }, { status: 500 });
  }
};

export const getCheckins: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("mood_checkins")
      .select("*")
      .eq("user_id", auth.user.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json({ checkins: (data || []).map(enrichCheckin) });
  } catch {
    return Response.json({ error: "Failed to fetch checkins" }, { status: 500 });
  }
};

export const getCheckinsLatest: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("mood_checkins")
      .select("*")
      .eq("user_id", auth.user.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return Response.json({ checkin: data ? enrichCheckin(data) : null });
  } catch {
    return Response.json({ error: "Failed to fetch latest checkin" }, { status: 500 });
  }
};

export const getCheckinsWeek: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from("mood_checkins")
    .select("created_at, mood_label")
    .eq("user_id", auth.user.userId)
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false });

  const rows = (data || []).map((r) => ({
    day: r.created_at?.slice(0, 10),
    mood_label: r.mood_label,
  }));

  return Response.json(rows);
};

export const getCheckinsAnalytics: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("mood_checkins")
      .select("mood_label")
      .eq("user_id", auth.user.userId);

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const label = row.mood_label;
      counts[label] = (counts[label] || 0) + 1;
    }
    const stats = Object.entries(counts).map(([mood_label, count]) => ({
      mood_label,
      count,
    }));

    return Response.json({ stats });
  } catch {
    return Response.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
};
