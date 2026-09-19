import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth, type RouteHandler } from "@/lib/server/http";

export const getIntegrationsStatus: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const db = getSupabaseAdmin();
    const { data: user, error } = await db
      .from("moodsync_profiles")
      .select(
        "spotify_access_token, spotify_refresh_token, google_access_token, google_refresh_token",
      )
      .eq("user_id", auth.user.userId)
      .maybeSingle();

    if (error) throw error;

    return Response.json({
      spotify: {
        connected: Boolean(
          user?.spotify_access_token || user?.spotify_refresh_token,
        ),
      },
      googleFit: {
        connected: Boolean(
          user?.google_access_token || user?.google_refresh_token,
        ),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("integrations/status error:", message);
    return Response.json({
      spotify: { connected: false },
      googleFit: { connected: false },
    });
  }
};
