import { getCheckinMoods } from "@/lib/checkinMoods";
import { getSupabaseAdmin } from "@/lib/supabase";

async function fetchIncomingFriendRequests(db: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: follows, error } = await db
    .from("mood_follows")
    .select("follower_id")
    .eq("following_id", userId)
    .eq("status", "pending");

  if (error) throw error;

  const followerIds = (follows || []).map((f) => f.follower_id);
  if (followerIds.length === 0) return [];

  const { data: profiles, error: pErr } = await db
    .from("moodsync_profiles")
    .select("user_id, username")
    .in("user_id", followerIds);

  if (pErr) throw pErr;

  return (profiles || []).map((u) => ({
    id: u.user_id,
    username: u.username,
  }));
}

async function fetchOutgoingPendingRequests(db: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: follows, error } = await db
    .from("mood_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "pending");

  if (error) throw error;

  const ids = (follows || []).map((f) => f.following_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: pErr } = await db
    .from("moodsync_profiles")
    .select("user_id, username")
    .in("user_id", ids);

  if (pErr) throw pErr;

  return (profiles || []).map((u) => ({
    id: u.user_id,
    username: u.username,
  }));
}

async function fetchMutualFriends(db: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: outgoing, error: outErr } = await db
    .from("mood_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "accepted");

  if (outErr) throw outErr;

  const { data: incoming, error: inErr } = await db
    .from("mood_follows")
    .select("follower_id")
    .eq("following_id", userId)
    .eq("status", "accepted");

  if (inErr) throw inErr;

  const incomingSet = new Set((incoming || []).map((r) => r.follower_id));
  const mutualIds = (outgoing || [])
    .map((r) => r.following_id)
    .filter((id) => incomingSet.has(id));

  if (mutualIds.length === 0) return [];

  const { data: profiles, error: profileErr } = await db
    .from("moodsync_profiles")
    .select("user_id, username")
    .in("user_id", mutualIds);

  if (profileErr) throw profileErr;

  const { data: recentCheckins } = await db
    .from("mood_checkins")
    .select("user_id, mood_label, note, mood_labels, created_at")
    .in("user_id", mutualIds)
    .order("created_at", { ascending: false });

  const latestMoodByUser = new Map<string, string>();
  for (const checkin of recentCheckins || []) {
    if (!latestMoodByUser.has(checkin.user_id)) {
      latestMoodByUser.set(checkin.user_id, getCheckinMoods(checkin));
    }
  }

  return (profiles || []).map((u) => ({
    id: u.user_id,
    username: u.username,
    last_mood: latestMoodByUser.get(u.user_id) || null,
  }));
}

export async function getFriendsSummaryForUser(userId: string) {
  const db = getSupabaseAdmin();
  const [friends, requests, pending] = await Promise.all([
    fetchMutualFriends(db, userId),
    fetchIncomingFriendRequests(db, userId),
    fetchOutgoingPendingRequests(db, userId),
  ]);
  return { friends, requests, pending };
}

export async function getMutualFriendsForUser(userId: string) {
  const db = getSupabaseAdmin();
  return fetchMutualFriends(db, userId);
}

export async function getIncomingFriendRequests(userId: string) {
  const db = getSupabaseAdmin();
  return fetchIncomingFriendRequests(db, userId);
}

export async function getOutgoingPendingRequests(userId: string) {
  const db = getSupabaseAdmin();
  return fetchOutgoingPendingRequests(db, userId);
}
