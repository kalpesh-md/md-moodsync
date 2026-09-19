import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthUser, unauthorizedResponse } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const db = getSupabaseAdmin();
    await db
      .from("moodsync_profiles")
      .update({
        spotify_access_token: null,
        spotify_refresh_token: null,
        spotify_token_expires: null,
      })
      .eq("user_id", user.userId);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("spotify/disconnect route error:", err);
    return Response.json({ error: "Failed to disconnect Spotify" }, { status: 500 });
  }
}
