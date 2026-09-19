export function profileAsUser(
  row: {
    user_id: string;
    username?: string | null;
    email?: string | null;
    share_mood?: boolean;
    share_trends?: boolean;
    share_ocean?: boolean;
    share_music?: boolean;
    share_fitness?: boolean;
  } | null,
  email?: string | null,
) {
  if (!row) return null;
  return {
    id: row.user_id,
    user_id: row.user_id,
    email: email ?? row.email ?? null,
    username: row.username,
    share_mood: row.share_mood,
    share_trends: row.share_trends,
    share_ocean: row.share_ocean,
    share_music: row.share_music,
    share_fitness: row.share_fitness,
  };
}
