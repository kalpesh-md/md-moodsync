import jwt from "jsonwebtoken";
import { ensureMoodSyncProfile } from "@/lib/profile";
import { readJsonBody, requireAuth, type RouteHandler } from "@/lib/server/http";
import { profileAsUser } from "@/lib/userProfile";

function jwtSecret(): string | undefined {
  return process.env.JWT_SECRET || process.env.MOODSYNC_SSO_SECRET;
}

export const getAuthMe: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const profile = await ensureMoodSyncProfile(
      auth.user.userId,
      auth.user.email ?? null,
    );
    return Response.json({ user: profileAsUser(profile, auth.user.email) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("auth/me error:", message);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
};

export const postAuthSso: RouteHandler = async (request) => {
  const { token } = await readJsonBody<{ token?: string }>(request);

  if (!token) {
    return Response.json({ error: "token is required" }, { status: 400 });
  }

  const ssoSecret = process.env.MOODSYNC_SSO_SECRET;
  if (!ssoSecret) {
    return Response.json({ error: "SSO not configured" }, { status: 500 });
  }

  try {
    const payload = jwt.verify(token, ssoSecret) as {
      aud?: string;
      userId?: string;
      sub?: string;
      email?: string | null;
    };
    if (payload.aud !== "moodsync") {
      return Response.json({ error: "Invalid audience" }, { status: 401 });
    }

    const userId = payload.userId || payload.sub;
    if (!userId) {
      return Response.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const email = payload.email ?? null;
    const profile = await ensureMoodSyncProfile(String(userId), email);

    const secret = jwtSecret();
    if (!secret) {
      return Response.json({ error: "SSO not configured" }, { status: 500 });
    }

    const appToken = jwt.sign({ userId: String(userId) }, secret, {
      expiresIn: "7d",
    });

    return Response.json({
      token: appToken,
      user: profileAsUser(profile, email),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SSO error:", message);
    return Response.json({ error: "Invalid SSO token" }, { status: 401 });
  }
};
