import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getCached,
  insightsCache,
  setCached,
} from "@/lib/server/cache";
import { extractJson, generateWithRetry } from "@/lib/server/gemini";
import {
  aggregateFeatures,
  fitnessPatterns,
  heuristicOcean,
  moodDistribution,
  moodPatternFromDist,
} from "@/lib/server/insights";
import { requireAuth, type RouteHandler } from "@/lib/server/http";

const MIN_CHECKINS = 5;

export const getPersonalityInsights: RouteHandler = async (request) => {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const userId = auth.user.userId;
  const db = getSupabaseAdmin();

  const { data: snapshots } = await db
    .from("mood_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: checkins } = await db
    .from("mood_checkins")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const checkinCount = (checkins || []).length;
  const snapshotCount = (snapshots || []).length;
  const dist = moodDistribution(checkins || []);
  const pattern = moodPatternFromDist(dist);

  const cached = getCached(insightsCache, userId);
  if (cached?.source === "ai") {
    return Response.json({
      ...cached,
      checkinCount,
      snapshotCount,
      moodPattern: pattern,
    });
  }

  if (checkinCount < MIN_CHECKINS) {
    return Response.json({
      source: "insufficient",
      checkinCount,
      snapshotCount,
      moodPattern: pattern,
      ocean: heuristicOcean(dist),
      mbti: null,
      insights: [
        {
          head: "Keep checking in",
          body: `Personality reads get sharper after ${MIN_CHECKINS} mood check-ins. You have ${checkinCount} so far.`,
        },
        {
          head: "Music + mood",
          body: snapshotCount
            ? "We're already watching how your listening lines up with how you feel."
            : "Connect Spotify so insights can mix music patterns with check-ins.",
        },
        {
          head: "No type guess yet",
          body: "We won't invent an MBTI type until there's enough of your own data.",
        },
      ],
    });
  }

  const systemPrompt = `You are a psychometric inference engine. Based on a user's music audio features, fitness patterns, and self-reported moods, estimate:
1. Big Five OCEAN scores (0-100 each)
2. Most likely MBTI type (4-letter code + confidence) — only if the data actually supports it
3. MBTI axis leanings as percentages toward the SECOND letter of each pair (e.g. IE: 65 means 65% leaning Extraversion)
4. 3 personalized insight strings grounded in the mood distribution

Return only JSON: { ocean: {O,C,E,A,N}, mbti: {type, confidence, axes: {IE, NS, TF, JP}}, insights: [{head, body, color}] }`;

  try {
    const prompt = `
    ${systemPrompt}

    Audio feature averages:
    ${JSON.stringify(aggregateFeatures(snapshots || []), null, 2)}

    Mood distribution:
    ${JSON.stringify(dist, null, 2)}

    Fitness patterns:
    ${JSON.stringify(fitnessPatterns(snapshots || []), null, 2)}
    `;

    const response = await generateWithRetry(prompt);
    const personality = extractJson(response.text()) as {
      ocean?: Record<string, number>;
      mbti?: { type?: string };
      insights?: { head: string; body: string; color?: string }[];
    };
    const payload = {
      source: "ai" as const,
      checkinCount,
      snapshotCount,
      moodPattern: pattern,
      ocean: personality?.ocean || heuristicOcean(dist),
      mbti: personality?.mbti?.type ? personality.mbti : null,
      insights: Array.isArray(personality?.insights) ? personality.insights : [],
    };
    setCached(insightsCache, userId, payload);
    return Response.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log("Personality AI error:", message);
    return Response.json({
      source: "heuristic",
      checkinCount,
      snapshotCount,
      moodPattern: pattern,
      ocean: heuristicOcean(dist),
      mbti: null,
      insights: [
        {
          head: "Working from your check-ins",
          body: "The full personality model is unavailable right now, so this is a mood-based sketch — not a diagnosis.",
        },
        {
          head: "What stands out",
          body: pattern[0]
            ? `Your most logged mood is ${pattern[0].label}. That pulls the trait mix below.`
            : "Keep logging moods to see a clearer trait mix.",
        },
        {
          head: "No MBTI estimate",
          body: "We skip a four-letter type when the model cannot run, instead of filling in a placeholder.",
        },
      ],
    });
  }
};
