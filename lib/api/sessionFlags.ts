const POST_OAUTH_KEY = "moodsync_post_oauth";

/** After Spotify/Fit OAuth redirect, skip heavy background prefetches. */
export function markPostOAuthReturn(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(POST_OAUTH_KEY, "1");
}

export function consumePostOAuthReturn(): boolean {
  if (typeof window === "undefined") return false;
  const value = sessionStorage.getItem(POST_OAUTH_KEY) === "1";
  if (value) sessionStorage.removeItem(POST_OAUTH_KEY);
  return value;
}
