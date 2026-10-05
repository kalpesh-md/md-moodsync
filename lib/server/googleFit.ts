import { getSupabaseAdmin } from "@/lib/supabase";

export type GoogleFitData = {
  steps: number;
  heartRate: number | null;
  sleepHours: number | null;
  authFailed?: boolean;
};

type GoogleProfile = {
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_token_expires?: string | null;
};

type CivilDateTime = {
  date: { year: number; month: number; day: number };
  time: { hours: number; minutes: number; seconds: number; nanos: number };
};

type HealthResult = {
  ok: boolean;
  status: number;
  json: Record<string, unknown>;
};

const HEALTH_API = "https://health.googleapis.com/v4";
const ASLEEP_STAGES = new Set(["LIGHT", "DEEP", "REM", "ASLEEP", "RESTLESS"]);

function civilDay(ms: number): CivilDateTime {
  const date = new Date(ms);
  return {
    date: {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    },
    time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
  };
}

function nextCivilDay(ms: number): CivilDateTime {
  const date = new Date(ms);
  date.setUTCDate(date.getUTCDate() + 1);
  return civilDay(date.getTime());
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

function roundHours(ms: number): number | null {
  if (ms <= 0) return null;
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function isTokenExpired(expires?: string | null): boolean {
  if (!expires) return true;
  return Date.now() > new Date(expires).getTime() - 60_000;
}

async function refreshGoogleToken(userId: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("moodsync_profiles")
    .select("google_refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user?.google_refresh_token) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: user.google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!data.access_token) {
    console.warn("Google Health token refresh failed:", response.status);
    return null;
  }

  const update: Record<string, string> = {
    google_access_token: data.access_token,
    google_token_expires: new Date(
      Date.now() + (Number(data.expires_in) || 3600) * 1000,
    ).toISOString(),
  };
  if (data.refresh_token) update.google_refresh_token = data.refresh_token;

  await db.from("moodsync_profiles").update(update).eq("user_id", userId);
  return data.access_token;
}

export async function ensureGoogleAccessToken(
  userId: string,
  user: GoogleProfile,
): Promise<{ token: string | null; needsReconnect: boolean }> {
  if (!user.google_access_token && !user.google_refresh_token) {
    return { token: null, needsReconnect: false };
  }
  if (!isTokenExpired(user.google_token_expires) && user.google_access_token) {
    return { token: user.google_access_token, needsReconnect: false };
  }
  if (!user.google_refresh_token) {
    return { token: user.google_access_token || null, needsReconnect: true };
  }
  try {
    const refreshed = await refreshGoogleToken(userId);
    if (refreshed) return { token: refreshed, needsReconnect: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Google Health refresh failed:", message);
  }
  return { token: user.google_access_token || null, needsReconnect: true };
}

async function healthRequest(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<HealthResult> {
  const res = await fetch(`${HEALTH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    console.warn(
      "Google Health request failed:",
      path,
      json.error?.message || res.status,
    );
  }
  return { ok: res.ok, status: res.status, json };
}

async function fetchSteps(
  accessToken: string,
  startMs: number,
): Promise<{ steps: number; status: number }> {
  const result = await healthRequest(
    accessToken,
    "/users/me/dataTypes/steps/dataPoints:dailyRollUp",
    {
      method: "POST",
      body: JSON.stringify({
        range: { start: civilDay(startMs), end: nextCivilDay(startMs) },
        windowSizeDays: 1,
        dataSourceFamily: "users/me/dataSourceFamilies/google-sources",
      }),
    },
  );
  const points = Array.isArray(result.json.rollupDataPoints)
    ? (result.json.rollupDataPoints as Array<{ steps?: { countSum?: unknown } }>)
    : [];
  const steps = points.reduce((sum, point) => sum + (asNumber(point.steps?.countSum) ?? 0), 0);
  return { steps, status: result.status };
}

async function fetchLatestHeartRate(
  accessToken: string,
  endMs: number,
): Promise<{ heartRate: number | null; status: number }> {
  const startMs = endMs - 7 * 24 * 60 * 60 * 1000;
  const result = await healthRequest(
    accessToken,
    "/users/me/dataTypes/heart-rate/dataPoints:dailyRollUp",
    {
      method: "POST",
      body: JSON.stringify({
        range: { start: civilDay(startMs), end: nextCivilDay(endMs) },
        windowSizeDays: 1,
        dataSourceFamily: "users/me/dataSourceFamilies/google-sources",
      }),
    },
  );
  const points = Array.isArray(result.json.rollupDataPoints)
    ? (result.json.rollupDataPoints as Array<{
        heartRate?: { beatsPerMinuteAvg?: unknown };
      }>)
    : [];

  let heartRate: number | null = null;
  for (const point of points) {
    const bpm = asNumber(point.heartRate?.beatsPerMinuteAvg);
    if (bpm != null) heartRate = Math.round(bpm);
  }
  return { heartRate, status: result.status };
}

function sleepHoursFromPoint(point: {
  sleep?: {
    interval?: { startTime?: string; endTime?: string };
    summary?: { minutesAsleep?: unknown };
    stages?: Array<{ startTime?: string; endTime?: string; type?: string }>;
  };
}): { endMs: number; hours: number } | null {
  const sleep = point.sleep;
  const endMs = Date.parse(sleep?.interval?.endTime || "");
  if (!Number.isFinite(endMs)) return null;

  const minutesAsleep = asNumber(sleep?.summary?.minutesAsleep);
  if (minutesAsleep != null) {
    return { endMs, hours: roundHours(minutesAsleep * 60_000) ?? 0 };
  }

  const stages = sleep?.stages || [];
  const asleepMs = stages.reduce((sum, stage) => {
    if (!stage.type || !ASLEEP_STAGES.has(stage.type.toUpperCase())) return sum;
    const start = Date.parse(stage.startTime || "");
    const end = Date.parse(stage.endTime || "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return sum;
    return sum + (end - start);
  }, 0);
  if (asleepMs > 0) {
    const hours = roundHours(asleepMs);
    return hours ? { endMs, hours } : null;
  }

  const startMs = Date.parse(sleep?.interval?.startTime || "");
  if (!Number.isFinite(startMs) || endMs <= startMs) return null;
  const hours = roundHours(endMs - startMs);
  return hours ? { endMs, hours } : null;
}

async function fetchSleepHours(
  accessToken: string,
  endMs: number,
): Promise<{ sleepHours: number | null; status: number }> {
  const startIso = new Date(endMs - 48 * 60 * 60 * 1000).toISOString();
  const endIso = new Date(endMs).toISOString();
  const filter = `sleep.interval.end_time >= "${startIso}" AND sleep.interval.end_time < "${endIso}"`;
  const result = await healthRequest(
    accessToken,
    `/users/me/dataTypes/sleep/dataPoints?pageSize=20&filter=${encodeURIComponent(filter)}`,
  );

  const points = Array.isArray(result.json.dataPoints)
    ? (result.json.dataPoints as Array<{
        sleep?: {
          interval?: { startTime?: string; endTime?: string };
          summary?: { minutesAsleep?: unknown };
          stages?: Array<{ startTime?: string; endTime?: string; type?: string }>;
        };
      }>)
    : [];

  let best: { endMs: number; hours: number } | null = null;
  for (const point of points) {
    const parsed = sleepHoursFromPoint(point);
    if (!parsed || parsed.hours <= 0) continue;
    if (!best || parsed.endMs > best.endMs) best = parsed;
  }

  return { sleepHours: best?.hours ?? null, status: result.status };
}

function authFailed(statuses: number[]): boolean {
  return statuses.length > 0 && statuses.every((status) => status === 401 || status === 403);
}

export async function fetchGoogleFitData(
  accessToken: string,
  startMs: number,
  endMs: number,
): Promise<GoogleFitData> {
  const [steps, heartRate, sleepHours] = await Promise.all([
    fetchSteps(accessToken, startMs),
    fetchLatestHeartRate(accessToken, endMs),
    fetchSleepHours(accessToken, endMs),
  ]);

  return {
    steps: steps.steps,
    heartRate: heartRate.heartRate,
    sleepHours: sleepHours.sleepHours,
    authFailed: authFailed([steps.status, heartRate.status, sleepHours.status]),
  };
}
