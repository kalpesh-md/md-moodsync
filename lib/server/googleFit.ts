const SLEEP_ACTIVITY_TYPE = 72;
const ASLEEP_SEGMENT_TYPES = new Set([2, 4, 5, 6]); // sleep, light, deep, REM

export type GoogleFitData = {
  steps: number;
  heartRate: number | null;
  sleepHours: number | null;
};

type FitPoint = {
  startTimeNanos?: string;
  endTimeNanos?: string;
  value?: Array<{ intVal?: number; fpVal?: number }>;
};

type FitSession = {
  activityType?: number;
  startTimeMillis?: string;
  endTimeMillis?: string;
};

function roundHours(ms: number): number | null {
  if (ms <= 0) return null;
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function readNumericValue(
  values?: Array<{ intVal?: number; fpVal?: number }>,
): number | null {
  const v = values?.[0];
  if (!v) return null;
  if (typeof v.fpVal === "number" && Number.isFinite(v.fpVal) && v.fpVal > 0) {
    return v.fpVal;
  }
  if (typeof v.intVal === "number" && v.intVal > 0) return v.intVal;
  return null;
}

async function fitnessAggregate(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{ bucket?: Array<{ dataset?: Array<{ point?: FitPoint[] }> }> }> {
  const res = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    bucket?: Array<{ dataset?: Array<{ point?: FitPoint[] }> }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    console.warn("Google Fit aggregate failed:", json.error?.message || res.status);
  }
  return json;
}

function collectPoints(
  result: { bucket?: Array<{ dataset?: Array<{ point?: FitPoint[] }> }> },
): FitPoint[] {
  const points: FitPoint[] = [];
  for (const bucket of result.bucket || []) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        points.push(point);
      }
    }
  }
  return points;
}

async function fetchSteps(
  accessToken: string,
  startMs: number,
  endMs: number,
): Promise<number> {
  const result = await fitnessAggregate(accessToken, {
    aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
    bucketByTime: { durationMillis: Math.max(endMs - startMs, 1) },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  });
  const point = result.bucket?.[0]?.dataset?.[0]?.point?.[0];
  return readNumericValue(point?.value) ?? 0;
}

/** Latest heart-rate sample in the last 7 days (phones without a watch often have none). */
async function fetchLatestHeartRate(
  accessToken: string,
  endMs: number,
): Promise<number | null> {
  const startMs = endMs - 7 * 24 * 60 * 60 * 1000;
  const result = await fitnessAggregate(accessToken, {
    aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  });

  let latestTime = 0;
  let latestBpm: number | null = null;

  for (const point of collectPoints(result)) {
    const bpm = readNumericValue(point.value);
    if (bpm == null) continue;
    const time = Number(point.endTimeNanos || point.startTimeNanos || 0);
    if (time >= latestTime) {
      latestTime = time;
      latestBpm = bpm;
    }
  }

  return latestBpm;
}

function latestSleepFromSessions(
  sessions: FitSession[],
  endMs: number,
): number | null {
  const cutoff = endMs - 48 * 60 * 60 * 1000;
  let best: { start: number; end: number } | null = null;

  for (const session of sessions) {
    if (session.activityType !== SLEEP_ACTIVITY_TYPE) continue;
    const start = Number(session.startTimeMillis || 0);
    const end = Number(session.endTimeMillis || 0);
    if (!start || !end || end <= start || end < cutoff || end > endMs) continue;
    if (!best || end > best.end) best = { start, end };
  }

  return best ? roundHours(best.end - best.start) : null;
}

function latestSleepFromSegmentPoints(
  points: FitPoint[],
  endMs: number,
): number | null {
  const cutoff = endMs - 48 * 60 * 60 * 1000;
  const segments: Array<{ start: number; end: number; duration: number }> = [];

  for (const point of points) {
    const type = point.value?.[0]?.intVal;
    if (type == null || !ASLEEP_SEGMENT_TYPES.has(type)) continue;
    const start = Number(point.startTimeNanos || 0) / 1e6;
    const end = Number(point.endTimeNanos || 0) / 1e6;
    if (!start || !end || end <= start || end < cutoff || end > endMs) continue;
    segments.push({ start, end, duration: end - start });
  }

  if (segments.length === 0) return null;

  const latestEnd = Math.max(...segments.map((s) => s.end));
  const nightWindowStart = latestEnd - 16 * 60 * 60 * 1000;
  const nightTotal = segments
    .filter((s) => s.end >= nightWindowStart && s.end <= latestEnd)
    .reduce((sum, s) => sum + s.duration, 0);

  return nightTotal > 0 ? roundHours(nightTotal) : null;
}

function latestSleepFromSessionPoints(
  points: FitPoint[],
  endMs: number,
): number | null {
  const cutoff = endMs - 48 * 60 * 60 * 1000;
  let best: { start: number; end: number } | null = null;

  for (const point of points) {
    const start = Number(point.startTimeNanos || 0) / 1e6;
    const end = Number(point.endTimeNanos || 0) / 1e6;
    if (!start || !end || end <= start || end < cutoff || end > endMs) continue;
    if (!best || end > best.end) best = { start, end };
  }

  return best ? roundHours(best.end - best.start) : null;
}

async function fetchSleepHours(
  accessToken: string,
  endMs: number,
): Promise<number | null> {
  const startMs = endMs - 48 * 60 * 60 * 1000;
  const headers = { Authorization: `Bearer ${accessToken}` };
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  try {
    const sessionsRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(startIso)}&endTime=${encodeURIComponent(endIso)}`,
      { headers },
    );
    const sessionsJson = (await sessionsRes.json().catch(() => ({}))) as {
      session?: FitSession[];
    };
    const fromSessions = latestSleepFromSessions(sessionsJson.session || [], endMs);
    if (fromSessions) return fromSessions;
  } catch {
    /* try aggregates */
  }

  try {
    const sessionAgg = await fitnessAggregate(accessToken, {
      aggregateBy: [{ dataTypeName: "com.google.sleep.session" }],
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    });
    const fromSessionPoints = latestSleepFromSessionPoints(
      collectPoints(sessionAgg),
      endMs,
    );
    if (fromSessionPoints) return fromSessionPoints;
  } catch {
    /* try segments */
  }

  try {
    const segmentAgg = await fitnessAggregate(accessToken, {
      aggregateBy: [{ dataTypeName: "com.google.sleep.segment" }],
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    });
    return latestSleepFromSegmentPoints(collectPoints(segmentAgg), endMs);
  } catch {
    return null;
  }
}

export async function fetchGoogleFitData(
  accessToken: string,
  startMs: number,
  endMs: number,
): Promise<GoogleFitData> {
  const [steps, heartRate, sleepHours] = await Promise.all([
    fetchSteps(accessToken, startMs, endMs),
    fetchLatestHeartRate(accessToken, endMs),
    fetchSleepHours(accessToken, endMs),
  ]);

  return { steps, heartRate, sleepHours };
}
