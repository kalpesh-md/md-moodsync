export async function fetchGoogleFitData(
  accessToken: string,
  startMs: number,
  endMs: number,
): Promise<{ steps: number; heartRate: number | null; sleepHours: null }> {
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
  return {
    steps: bucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0,
    heartRate:
      bucket?.dataset?.[1]?.point?.[0]?.value?.[0]?.fpVal || null,
    sleepHours: null,
  };
}
