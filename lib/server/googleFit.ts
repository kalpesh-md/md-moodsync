const SLEEP_ACTIVITY_TYPE = 72;
const ASLEEP_SEGMENT_TYPES = new Set([2, 4, 5, 6]); // sleep, light, deep, REM

export type GoogleFitData = {
  steps: number;
  heartRate: number | null;
  sleepHours: number | null;
};

function roundHours(ms: number): number | null {
  if (ms <= 0) return null;
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function sumSleepSessions(
  sessions: Array<{ activityType?: number; startTimeMillis?: string; endTimeMillis?: string }>,
): number {
  return sessions.reduce((total, session) => {
    if (session.activityType !== SLEEP_ACTIVITY_TYPE) return total;
    const start = Number(session.startTimeMillis || 0);
    const end = Number(session.endTimeMillis || 0);
    if (!start || !end || end <= start) return total;
    return total + (end - start);
  }, 0);
}

function sumSleepSegments(
  points: Array<{
    startTimeNanos?: string;
    endTimeNanos?: string;
    value?: Array<{ intVal?: number }>;
  }>,
): number {
  return points.reduce((total, point) => {
    const type = point.value?.[0]?.intVal;
    if (type == null || !ASLEEP_SEGMENT_TYPES.has(type)) return total;
    const start = Number(point.startTimeNanos || 0) / 1e6;
    const end = Number(point.endTimeNanos || 0) / 1e6;
    if (!start || !end || end <= start) return total;
    return total + (end - start);
  }, 0);
}

async function fetchSleepHours(
  accessToken: string,
  startMs: number,
  endMs: number,
): Promise<number | null> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  try {
    const sessionsRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(startIso)}&endTime=${encodeURIComponent(endIso)}&activityType=${SLEEP_ACTIVITY_TYPE}`,
      { headers },
    );
    const sessionsJson = (await sessionsRes.json().catch(() => ({}))) as {
      session?: Array<{ activityType?: number; startTimeMillis?: string; endTimeMillis?: string }>;
    };
    const fromSessions = roundHours(sumSleepSessions(sessionsJson.session || []));
    if (fromSessions) return fromSessions;
  } catch {
    /* fall through to segments */
  }

  try {
    const result = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: "com.google.sleep.segment" }],
          startTimeMillis: startMs,
          endTimeMillis: endMs,
        }),
      },
    ).then((r) => r.json() as Promise<{
      bucket?: Array<{ dataset?: Array<{ point?: unknown[] }> }>;
    }>);

    const points = (result.bucket?.[0]?.dataset?.[0]?.point || []) as Array<{
      startTimeNanos?: string;
      endTimeNanos?: string;
      value?: Array<{ intVal?: number }>;
    }>;
    return roundHours(sumSleepSegments(points));
  } catch {
    return null;
  }
}

export async function fetchGoogleFitData(
  accessToken: string,
  startMs: number,
  endMs: number,
): Promise<GoogleFitData> {
  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.heart_rate.bpm" },
    ],
    bucketByTime: { durationMillis: endMs - startMs },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };

  const result = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  )
    .then((r) => r.json())
    .catch(() => ({}));

  const bucket = result.bucket?.[0];
  const sleepStart = endMs - 36 * 60 * 60 * 1000;
  const sleepHours = await fetchSleepHours(accessToken, sleepStart, endMs);

  return {
    steps: bucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0,
    heartRate:
      bucket?.dataset?.[1]?.point?.[0]?.value?.[0]?.fpVal || null,
    sleepHours,
  };
}
