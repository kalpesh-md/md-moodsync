import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthUser, unauthorizedResponse } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const db = getSupabaseAdmin();
    const { data: profile, error } = await db
      .from("moodsync_profiles")
      .select(
        "spotify_access_token, spotify_refresh_token, google_access_token, google_refresh_token",
      )
      .eq("user_id", user.userId)
      .maybeSingle();

    if (error) throw error;

    return Response.json({
      spotify: {
        connected: Boolean(
          profile?.spotify_access_token || profile?.spotify_refresh_token,
        ),
      },
      googleFit: {
        connected: Boolean(
          profile?.google_access_token || profile?.google_refresh_token,
        ),
      },
    });
  } catch (err) {
    console.error("integrations/status route error:", err);
    return Response.json({
      spotify: { connected: false },
      googleFit: { connected: false },
    });
  }
}
