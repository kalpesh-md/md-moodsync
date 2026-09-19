import { getSupabaseAdmin } from "@/lib/supabase";
import { getQueryParam, requireAuth, type RouteHandler } from "@/lib/server/http";

export const getUsersSearch: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const q = getQueryParam(request, "q") || "";
    const db = getSupabaseAdmin();

    const { data: users, error } = await db
      .from("moodsync_profiles")
      .select("user_id, username")
      .ilike("username", `%${q}%`)
      .neq("user_id", auth.user.userId)
      .order("username")
      .limit(10);

    if (error) throw error;

    return Response.json(
      (users || []).map((u) => ({
        id: u.user_id,
        username: u.username,
      })),
    );
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to search users" }, { status: 500 });
  }
};
