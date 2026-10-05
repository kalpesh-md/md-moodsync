/**
 * Supabase env helpers — new API keys (same as MoodScale md-latest).
 * @see https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
 */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

/** Browser / RLS-scoped key (`sb_publishable_…`). */
export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

/** Alias for getSupabasePublishableKey (legacy call-site name). */
export function getSupabaseAnonKey(): string {
  return getSupabasePublishableKey();
}

/** Server / bypass-RLS key (`sb_secret_…`). Never expose to the client. */
export function getSupabaseSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

/** Alias for getSupabaseSecretKey (legacy call-site name). */
export function getSupabaseServiceKey(): string {
  return getSupabaseSecretKey();
}
