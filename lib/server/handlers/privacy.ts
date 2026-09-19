import { getSupabaseAdmin } from "@/lib/supabase";
import { readJsonBody, requireAuth, type RouteHandler } from "@/lib/server/http";

export const putPrivacy: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const {
    share_mood,
    share_trends,
    share_ocean,
    share_music,
    share_fitness,
  } = await readJsonBody<{
    share_mood?: boolean;
    share_trends?: boolean;
    share_ocean?: boolean;
    share_music?: boolean;
    share_fitness?: boolean;
  }>(request);

  const db = getSupabaseAdmin();

  try {
    const { error } = await db
      .from("moodsync_profiles")
      .update({
        share_mood,
        share_trends,
        share_ocean,
        share_music,
        share_fitness,
      })
      .eq("user_id", auth.user.userId);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to update privacy settings" }, { status: 500 });
  }
};
