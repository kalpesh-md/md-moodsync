import jwt from "jsonwebtoken";
import { getUserFromAccessToken } from "@/lib/supabase";

export interface AuthUser {
  userId: string;
  email?: string;
}

function jwtSecret(): string | undefined {
  return process.env.JWT_SECRET || process.env.MOODSYNC_SSO_SECRET;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;

  const secret = jwtSecret();
  if (secret) {
    try {
      const decoded = jwt.verify(token, secret) as {
        userId?: string;
        sub?: string;
        email?: string;
      };
      const userId = decoded.userId || decoded.sub;
      if (userId) {
        return { userId: String(userId), email: decoded.email };
      }
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) return null;
    }
  }

  try {
    const supabaseUser = await getUserFromAccessToken(token);
    if (supabaseUser) {
      return {
        userId: supabaseUser.id,
        email: supabaseUser.email ?? undefined,
      };
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
