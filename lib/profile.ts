import { getSupabaseAdmin } from "@/lib/supabase";

function usernameFromEmail(email?: string | null, userId?: string): string {
  const prefix = email?.split("@")[0]?.trim();
  if (prefix) {
    return prefix.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  }
  return `user_${(userId ?? "anon").slice(0, 8)}`;
}

/** Ensure moodsync_profiles row exists for a MoodScale auth user. */
export async function ensureMoodSyncProfile(
  userId: string,
  email?: string | null,
) {
  const db = getSupabaseAdmin();

  const { data: existing, error: selectError } = await db
    .from("moodsync_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const username = usernameFromEmail(email, userId);
  const { data, error } = await db
    .from("moodsync_profiles")
    .upsert({ user_id: userId, username }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const fallback = `${username}_${userId.slice(0, 6)}`;
    const retry = await db
      .from("moodsync_profiles")
      .upsert({ user_id: userId, username: fallback }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  if (error) throw error;
  return data;
}
