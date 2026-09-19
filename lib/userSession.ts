import type { User } from "@/lib/api/user";

const USER_CACHE_KEY = "moodsync_user_cache";

export function cacheUserSession(user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    /* ignore quota errors */
  }
}

export function readCachedUserSession(): User | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as User;
  } catch {
    return undefined;
  }
}

export function clearUserSessionCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_CACHE_KEY);
}
