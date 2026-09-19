/** Public site origin for OAuth redirects (avoids localhost env on Vercel). */
export function getPublicOrigin(request: Request): string {
  const xfHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const xfProto = String(request.headers.get("x-forwarded-proto") || "https")
    .split(",")[0]
    .trim();
  const host = xfHost ? String(xfHost).split(",")[0].trim() : "";
  const isLocal =
    !host || host.includes("localhost") || host.startsWith("127.0.0.1");

  if (host && !isLocal) {
    return `${xfProto}://${host}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.replace(/\/$/, "");
  }
  return "http://localhost:3001";
}

export function getSpotifyRedirectUri(request: Request): string {
  const origin = getPublicOrigin(request);
  const fromEnv = process.env.SPOTIFY_REDIRECT_URI;
  if (fromEnv) {
    try {
      if (new URL(fromEnv).origin === origin) return fromEnv;
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return fromEnv;
      }
    } catch {
      /* ignore bad env */
    }
  }
  return `${origin}/api/spotify/callback`;
}

export function getGoogleRedirectUri(request: Request): string {
  const origin = getPublicOrigin(request);
  const fromEnv =
    process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_FIT_REDIRECT_URI;
  if (fromEnv) {
    try {
      if (new URL(fromEnv).origin === origin) return fromEnv;
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return fromEnv;
      }
    } catch {
      /* ignore */
    }
  }
  return `${origin}/api/fit/callback`;
}
