import { getSupabaseAdmin } from "@/lib/supabase";
import { sendFriendRequestEmail } from "@/lib/server/email";
import {
  getFriendsSummaryForUser,
  getIncomingFriendRequests,
  getMutualFriendsForUser,
  getOutgoingPendingRequests,
} from "@/lib/server/friends";
import { readJsonBody, requireAuth, type RouteHandler } from "@/lib/server/http";

export const getFriendsSummary: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const summary = await getFriendsSummaryForUser(auth.user.userId);
    return Response.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("friends/summary error:", message);
    return Response.json({ friends: [], requests: [], pending: [] });
  }
};

export const getFriendsRequests: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const requests = await getIncomingFriendRequests(auth.user.userId);
    return Response.json(requests);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to fetch friend requests" }, { status: 500 });
  }
};

export const getFriendsPending: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const pending = await getOutgoingPendingRequests(auth.user.userId);
    return Response.json(pending);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to fetch pending requests" }, { status: 500 });
  }
};

export const getFriendsList: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const friends = await getMutualFriendsForUser(auth.user.userId);
    return Response.json(friends);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("friends error:", message);
    return Response.json([]);
  }
};

export const postFriendsRequest: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { targetUsername } = await readJsonBody<{ targetUsername?: string }>(request);
  const db = getSupabaseAdmin();

  const { data: target } = await db
    .from("moodsync_profiles")
    .select("user_id, username")
    .eq("username", targetUsername)
    .maybeSingle();

  if (!target) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: sender } = await db
    .from("moodsync_profiles")
    .select("username")
    .eq("user_id", auth.user.userId)
    .maybeSingle();

  await db.from("mood_follows").upsert(
    {
      follower_id: auth.user.userId,
      following_id: target.user_id,
      status: "pending",
    },
    { onConflict: "follower_id,following_id", ignoreDuplicates: true },
  );

  let targetEmail: string | null = null;
  try {
    const { data: authData } = await db.auth.admin.getUserById(target.user_id);
    targetEmail = authData?.user?.email ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("Could not look up target email:", message);
  }

  if (targetEmail) {
    sendFriendRequestEmail(
      targetEmail,
      target.username,
      sender?.username || "Someone",
    );
  }

  return Response.json({ sent: true });
};

export const postFriendsAccept: RouteHandler = async (request, ctx) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const followerId = ctx.params.followerId;
  const db = getSupabaseAdmin();

  await db
    .from("mood_follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("following_id", auth.user.userId);

  await db.from("mood_follows").upsert(
    {
      follower_id: auth.user.userId,
      following_id: followerId,
      status: "accepted",
    },
    { onConflict: "follower_id,following_id", ignoreDuplicates: true },
  );

  return Response.json({ accepted: true });
};

export const deleteFriendsRequest: RouteHandler = async (request, ctx) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const followerId = ctx.params.followerId;
  const db = getSupabaseAdmin();

  try {
    await db
      .from("mood_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", auth.user.userId)
      .eq("status", "pending");

    return Response.json({ deleted: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to ignore request" }, { status: 500 });
  }
};

export const getFriendMoodTrend: RouteHandler = async (request, ctx) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = getSupabaseAdmin();
  const userId = auth.user.userId;
  const friendId = ctx.params.friendId;

  const { data: a } = await db
    .from("mood_follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", friendId)
    .eq("status", "accepted")
    .maybeSingle();

  const { data: b } = await db
    .from("mood_follows")
    .select("follower_id")
    .eq("follower_id", friendId)
    .eq("following_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!a || !b) {
    return Response.json({ error: "Not mutual friends" }, { status: 403 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: snapshots } = await db
    .from("mood_snapshots")
    .select("created_at, score")
    .eq("user_id", friendId)
    .gte("created_at", weekAgo);

  const byDay: Record<string, number[]> = {};
  for (const s of snapshots || []) {
    const day = s.created_at?.slice(0, 10);
    if (!day) continue;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(Number(s.score) || 0);
  }

  const rows = Object.entries(byDay)
    .map(([day, scores]) => ({
      day,
      avg_score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((x, y) => x.day.localeCompare(y.day));

  return Response.json(rows);
};
