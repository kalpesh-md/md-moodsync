import { getFriendsSummaryForUser } from "@/lib/server/friends";
import { getAuthUser, unauthorizedResponse } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const summary = await getFriendsSummaryForUser(user.userId);
    return Response.json(summary);
  } catch (err) {
    console.error("friends/summary route error:", err);
    return Response.json({ friends: [], requests: [], pending: [] });
  }
}
