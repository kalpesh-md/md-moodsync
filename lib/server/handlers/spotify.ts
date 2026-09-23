import jwt from "jsonwebtoken";
import { ensureMoodSyncProfile } from "@/lib/profile";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getQueryParam,
  requireAuth,
  type RouteHandler,
} from "@/lib/server/http";
import {
  getPublicOrigin,
  getSpotifyRedirectUri,
} from "@/lib/server/origin";

function jwtSecret(): string | undefined {
  return process.env.JWT_SECRET || process.env.MOODSYNC_SSO_SECRET;
}

function signSpotifyOAuthState(userId: string): string {
  const secret = jwtSecret();
  if (!secret) return userId;
  return jwt.sign({ userId, purpose: "spotify_oauth" }, secret, {
    expiresIn: "15m",
  });
}

function resolveSpotifyOAuthUserId(state: string | null): string | null {
  if (!state) return null;
  const secret = jwtSecret();
  if (secret) {
    try {
      const payload = jwt.verify(state, secret) as {
        userId?: string;
        purpose?: string;
      };
      if (payload.purpose === "spotify_oauth" && payload.userId) {
        return String(payload.userId);
      }
    } catch {
      /* fall through — legacy raw userId in state */
    }
  }
  if (state.length >= 8 && state.length <= 128) return state;
  return null;
}

export const getSpotifyAuthUrl: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return Response.json(
      { error: "Spotify is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const scopes = [
      "user-read-recently-played",
      "user-top-read",
      "user-read-currently-playing",
      "user-read-playback-state",
    ].join(" ");

    const redirectUri = getSpotifyRedirectUri(request);
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes,
      state: signSpotifyOAuthState(auth.user.userId),
      show_dialog: "true",
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return Response.json({ url, redirect_uri: redirectUri });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("spotify/auth-url error:", message);
    return Response.json({ error: "Could not start Spotify connect" }, { status: 500 });
  }
};

export const postSpotifyDisconnect: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = getSupabaseAdmin();
  await db
    .from("moodsync_profiles")
    .update({
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires: null,
    })
    .eq("user_id", auth.user.userId);

  return Response.json({ ok: true });
};

export const getSpotifyCallback: RouteHandler = async (request) => {
  const code = getQueryParam(request, "code");
  const userId = resolveSpotifyOAuthUserId(getQueryParam(request, "state"));
  const db = getSupabaseAdmin();
  const redirectUri = getSpotifyRedirectUri(request);
  const clientOrigin = getPublicOrigin(request);

  if (!code || !userId) {
    return Response.redirect(`${clientOrigin}/?error=spotify`, 302);
  }

  await ensureMoodSyncProfile(userId, null);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokens = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!tokens.access_token) {
    console.error("Spotify token exchange failed:", tokens);
    return Response.redirect(`${clientOrigin}/?error=spotify`, 302);
  }

  const spotifyUpdate: Record<string, string> = {
    spotify_access_token: tokens.access_token,
    spotify_token_expires: new Date(
      Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
    ).toISOString(),
  };
  if (tokens.refresh_token) {
    spotifyUpdate.spotify_refresh_token = tokens.refresh_token;
  }

  await db.from("moodsync_profiles").update(spotifyUpdate).eq("user_id", userId);

  return Response.redirect(`${clientOrigin}/?connected=spotify`, 302);
};

export const getSpotifyStatus: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("moodsync_profiles")
    .select("*")
    .eq("user_id", auth.user.userId)
    .maybeSingle();

  if (!user?.spotify_access_token) {
    return Response.json({ connected: false, error: "No Spotify token" });
  }

  try {
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${user.spotify_access_token}` },
    });

    if (profileRes.ok) {
      const profile = await profileRes.json();
      return Response.json({ connected: true, user: profile.display_name });
    }
    return Response.json({ connected: false, error: "Token invalid or expired" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ connected: false, error: message });
  }
};
