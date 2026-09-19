const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const forecastCache = new Map<string, CacheEntry<unknown>>();

export interface InsightsCachePayload {
  source?: string;
  checkinCount?: number;
  snapshotCount?: number;
  moodPattern?: { label: string; count: number }[];
  ocean?: Record<string, number>;
  mbti?: unknown;
  insights?: { head: string; body: string; color?: string }[];
}

export const insightsCache = new Map<string, CacheEntry<InsightsCachePayload>>();

export function getCached<T>(cache: Map<string, CacheEntry<T>>, userId: string): T | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return entry.data;
}

export function getStaleCached<T>(
  cache: Map<string, CacheEntry<T>>,
  userId: string,
): T | null {
  return cache.get(userId)?.data ?? null;
}

export function setCached<T>(
  cache: Map<string, CacheEntry<T>>,
  userId: string,
  data: T,
): void {
  cache.set(userId, { data, timestamp: Date.now() });
}
