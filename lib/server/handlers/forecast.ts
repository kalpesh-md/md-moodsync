import { getSupabaseAdmin } from "@/lib/supabase";
import {
  forecastCache,
  getCached,
  getStaleCached,
  setCached,
} from "@/lib/server/cache";
import { MOCK_FORECAST, normalizeForecastItems } from "@/lib/server/forecast";
import { extractJson, generateWithRetry } from "@/lib/server/gemini";
import { requireAuth, type RouteHandler } from "@/lib/server/http";

export const getForecast: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;

  const cached = getCached(forecastCache, userId);
  if (cached) {
    return Response.json({ forecast: cached, source: "cache" });
  }

  try {
    const db = getSupabaseAdmin();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: snapshots } = await db
      .from("mood_snapshots")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: true });

    const { data: checkins } = await db
      .from("mood_checkins")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: true });

    const hasGemini =
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "your_gemini_key";

    if (hasGemini) {
      try {
        const systemPrompt = `You are a mood prediction engine. Given a user's music listening data, 
        fitness data, and self-reported check-ins from the past 7 days, predict their mood for the next 
        3 time windows: next 2 hours, tonight (7-10pm), and tomorrow morning (8-11am).

        For each window return JSON:
        { timeLabel, predictedMood, confidence (0-100), doNow: string[], avoid: string[] }

        Return only a JSON array of exactly 3 objects, no markdown.`;

        const prompt = `
        ${systemPrompt}

        Mood snapshots:
        ${JSON.stringify((snapshots || []).slice(-20), null, 2)}

        Check-ins:
        ${JSON.stringify(checkins || [], null, 2)}

        Current time:
        ${new Date().toISOString()}
        `;

        const response = await generateWithRetry(prompt, 3, 1500);
        const forecast = normalizeForecastItems(extractJson(response.text()));

        if (forecast) {
          setCached(forecastCache, userId, forecast);
          return Response.json({ forecast, source: "ai" });
        }

        console.log("AI forecast invalid shape — using fallback");
      } catch (aiError) {
        const message = aiError instanceof Error ? aiError.message : String(aiError);
        console.log("AI forecast error:", message);
        const stale = getStaleCached(forecastCache, userId);
        if (stale) {
          return Response.json({ forecast: stale, source: "cache" });
        }
      }
    }

    return Response.json({ forecast: MOCK_FORECAST, source: "mock" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("Forecast error:", message);
    const stale = getStaleCached(forecastCache, userId);
    if (stale) {
      return Response.json({ forecast: stale, source: "cache" });
    }
    return Response.json({ forecast: MOCK_FORECAST, source: "fallback" });
  }
};
