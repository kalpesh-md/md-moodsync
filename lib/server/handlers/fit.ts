import { getSupabaseAdmin } from "@/lib/supabase";
import { getQueryParam, requireAuth, type RouteHandler } from "@/lib/server/http";
import { getGoogleRedirectUri, getPublicOrigin } from "@/lib/server/origin";

export const getFitAuthUrl: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const scopes = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
  ].join(" ");

  const redirectUri = getGoogleRedirectUri(request);
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline&prompt=consent&state=${auth.user.userId}`;

  return Response.json({ url, redirect_uri: redirectUri });
};

export const getFitCallback: RouteHandler = async (request) => {
  const code = getQueryParam(request, "code");
  const userId = getQueryParam(request, "state");
  const db = getSupabaseAdmin();
  const redirectUri = getGoogleRedirectUri(request);
  const clientOrigin = getPublicOrigin(request);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code || "",
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  await db
    .from("moodsync_profiles")
    .update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expires: new Date(
        Date.now() + (tokens.expires_in || 3600) * 1000,
      ).toISOString(),
    })
    .eq("user_id", userId);

  return Response.redirect(`${clientOrigin}/?connected=googlefit`, 302);
};
