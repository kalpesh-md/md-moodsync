import { ensureMoodSyncProfile } from "@/lib/profile";
import { getAuthUser, unauthorizedResponse } from "@/lib/server/auth";
import { profileAsUser } from "@/lib/userProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const profile = await ensureMoodSyncProfile(user.userId, user.email ?? null);
    return Response.json({ user: profileAsUser(profile, user.email) });
  } catch (err) {
    console.error("auth/me route error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
