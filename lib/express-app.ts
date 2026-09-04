/**
 * MoodSync Backend — Express API (mounted via App Router catch-all).
 * Uses Supabase (service role) instead of pg Pool + bcrypt.
 */

// @ts-nocheck

import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AWS from "aws-sdk";
import { getSupabaseAdmin, getUserFromAccessToken } from "@/lib/supabase";
import { ensureMoodSyncProfile } from "@/lib/profile";
import {
  encodeCheckinNote,
  enrichCheckin,
  getCheckinMoods,
} from "@/lib/checkinMoods";
import {
  energyBand,
  energyFromMoods,
  estimateTrackEnergy,
  reasonForTrack,
} from "@/lib/moodEnergy";

AWS.config.update({
  accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  region: process.env.AWS_SES_REGION || "ap-south-1",
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

const app = express();

app.use(express.json());
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
  });
});

app.use(helmet({ contentSecurityPolicy: false }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const forecastCache = new Map();
const insightsCache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

function getCached(cache, userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return entry.data;
}

function getStaleCached(cache, userId) {
  return cache.get(userId)?.data ?? null;
}

function setCached(cache, userId, data) {
  cache.set(userId, { data, timestamp: Date.now() });
}

const MOCK_FORECAST = [
  {
    timeLabel: "Next 2 hours",
    predictedMood: "Focused",
    confidence: 75,
    doNow: ["Take a short break", "Stay hydrated", "Tackle one priority task"],
    avoid: ["Multitasking", "Heavy caffeine"],
  },
  {
    timeLabel: "Tonight (7-10pm)",
    predictedMood: "Calm",
    confidence: 70,
    doNow: ["Wind down with music", "Light stretching", "Plan tomorrow lightly"],
    avoid: ["Stressful emails", "Late caffeine"],
  },
  {
    timeLabel: "Tomorrow Morning (8-11am)",
    predictedMood: "Energetic",
    confidence: 80,
    doNow: ["Plan your top 3 tasks", "Get morning sunlight", "Eat a balanced breakfast"],
    avoid: ["Skipping breakfast", "Diving into notifications first"],
  },
];

function normalizeForecastItems(data) {
  const raw = Array.isArray(data)
    ? data
    : Array.isArray(data?.forecast)
      ? data.forecast
      : null;

  if (!raw?.length) return null;

  const normalized = raw
    .map((item) => ({
      timeLabel: String(item?.timeLabel || item?.time || "Upcoming"),
      predictedMood: String(item?.predictedMood || item?.mood || "Balanced"),
      confidence: Math.min(
        100,
        Math.max(0, Number(item?.confidence ?? 60) || 60),
      ),
      doNow: Array.isArray(item?.doNow)
        ? item.doNow.map(String)
        : ["Take a mindful pause"],
      avoid: Array.isArray(item?.avoid)
        ? item.avoid.map(String)
        : ["Overcommitting"],
    }))
    .filter((item) => item.timeLabel && item.predictedMood);

  return normalized.length > 0 ? normalized.slice(0, 3) : null;
}

function jwtSecret() {
  return process.env.JWT_SECRET || process.env.MOODSYNC_SSO_SECRET;
}

/** Public site origin for OAuth redirects (avoids localhost env on Vercel). */
function getPublicOrigin(req) {
  const xfHost = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  const xfProto = String(req?.headers?.["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  const host = xfHost ? String(xfHost).split(",")[0].trim() : "";
  const isLocal =
    !host || host.includes("localhost") || host.startsWith("127.0.0.1");

  if (host && !isLocal) {
    return `${xfProto}://${host}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.replace(/\/$/, "");
  }
  return "http://localhost:3001";
}

function getSpotifyRedirectUri(req) {
  const origin = getPublicOrigin(req);
  const fromEnv = process.env.SPOTIFY_REDIRECT_URI;
  if (fromEnv) {
    try {
      if (new URL(fromEnv).origin === origin) return fromEnv;
      // Env still points at localhost while request is production — prefer request host
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return fromEnv;
      }
    } catch {
      /* ignore bad env */
    }
  }
  return `${origin}/api/spotify/callback`;
}

function getGoogleRedirectUri(req) {
  const origin = getPublicOrigin(req);
  const fromEnv =
    process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_FIT_REDIRECT_URI;
  if (fromEnv) {
    try {
      if (new URL(fromEnv).origin === origin) return fromEnv;
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return fromEnv;
      }
    } catch {
      /* ignore */
    }
  }
  return `${origin}/api/fit/callback`;
}

/** Map Title Case / mixed mood labels to lowercase mood_checkins enum. */
function toMoodEnum(mood) {
  if (mood == null || mood === "") return mood;
  return String(mood).trim().toLowerCase();
}

function profileAsUser(row, email) {
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

// ============================================
// 2. AUTHENTICATION MIDDLEWARE
// ============================================

async function authRequired(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabaseUser = await getUserFromAccessToken(token);
    if (supabaseUser) {
      req.user = {
        userId: supabaseUser.id,
        email: supabaseUser.email ?? undefined,
      };
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret());
    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = {
      userId: String(userId),
      email: decoded.email ?? undefined,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ============================================
// 3. USER AUTHENTICATION ROUTES
// ============================================

app.get("/api/auth/me", authRequired, async (req, res) => {
  try {
    const profile = await ensureMoodSyncProfile(
      req.user.userId,
      req.user.email ?? null,
    );
    res.json({ user: profileAsUser(profile, req.user.email) });
  } catch (err) {
    console.error("auth/me error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/sso", async (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }

  const ssoSecret = process.env.MOODSYNC_SSO_SECRET;
  if (!ssoSecret) {
    return res.status(500).json({ error: "SSO not configured" });
  }

  try {
    const payload = jwt.verify(token, ssoSecret);
    if (payload.aud !== "moodsync") {
      return res.status(401).json({ error: "Invalid audience" });
    }

    const userId = payload.userId || payload.sub;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const email = payload.email ?? null;
    const profile = await ensureMoodSyncProfile(String(userId), email);

    const appToken = jwt.sign(
      { userId: String(userId) },
      jwtSecret(),
      { expiresIn: "7d" },
    );

    res.json({
      token: appToken,
      user: profileAsUser(profile, email),
    });
  } catch (err) {
    console.error("SSO error:", err.message);
    res.status(401).json({ error: "Invalid SSO token" });
  }
});

// ============================================
// 4. SPOTIFY INTEGRATION ROUTES
// ============================================

app.get("/api/spotify/auth-url", authRequired, (req, res) => {
  const scopes = [
    "user-read-recently-played",
    "user-top-read",
    "user-read-currently-playing",
    "user-read-playback-state",
  ].join(" ");

  const redirectUri = getSpotifyRedirectUri(req);
  const url =
    `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}&state=${req.user.userId}`;

  res.json({ url, redirect_uri: redirectUri });
});

app.get("/api/spotify/callback", async (req, res) => {
  const { code, state: userId } = req.query;
  const db = getSupabaseAdmin();
  const redirectUri = getSpotifyRedirectUri(req);
  const clientOrigin = getPublicOrigin(req);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokens = await response.json();

  await db
    .from("moodsync_profiles")
    .update({
      spotify_access_token: tokens.access_token,
      spotify_refresh_token: tokens.refresh_token,
      spotify_token_expires: new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString(),
    })
    .eq("user_id", userId);

  res.redirect(`${clientOrigin}/?connected=spotify`);
});

app.get("/api/integrations/status", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("moodsync_profiles")
    .select("spotify_access_token, google_access_token")
    .eq("user_id", userId)
    .maybeSingle();

  res.json({
    spotify: { connected: Boolean(user?.spotify_access_token) },
    googleFit: { connected: Boolean(user?.google_access_token) },
  });
});

app.get("/api/spotify/status", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("moodsync_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user?.spotify_access_token) {
    return res.json({ connected: false, error: "No Spotify token" });
  }

  try {
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${user.spotify_access_token}` },
    });

    if (profileRes.ok) {
      const profile = await profileRes.json();
      return res.json({ connected: true, user: profile.display_name });
    } else {
      return res.json({ connected: false, error: "Token invalid or expired" });
    }
  } catch (err) {
    return res.json({ connected: false, error: err.message });
  }
});

// ============================================
// 5. GOOGLE FIT INTEGRATION ROUTES
// ============================================

app.get("/api/fit/auth-url", authRequired, (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
  ].join(" ");

  const redirectUri = getGoogleRedirectUri(req);
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline&prompt=consent&state=${req.user.userId}`;

  res.json({ url, redirect_uri: redirectUri });
});

app.get("/api/fit/callback", async (req, res) => {
  const { code, state: userId } = req.query;
  const db = getSupabaseAdmin();
  const redirectUri = getGoogleRedirectUri(req);
  const clientOrigin = getPublicOrigin(req);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await response.json();

  await db
    .from("moodsync_profiles")
    .update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expires: new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString(),
    })
    .eq("user_id", userId);

  res.redirect(`${clientOrigin}/?connected=googlefit`);
});

// ============================================
// 6. MOOD SYNC ROUTE
// ============================================

app.post("/api/mood/sync", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const db = getSupabaseAdmin();

  const { data: user } = await db
    .from("moodsync_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user) {
    return res.status(404).json({ error: "Profile not found" });
  }

  if (
    (!user.spotify_token_expires ||
      new Date() > new Date(user.spotify_token_expires)) &&
    user.spotify_refresh_token
  ) {
    try {
      const newAccessToken = await refreshSpotifyToken(userId);
      if (newAccessToken) {
        user.spotify_access_token = newAccessToken;
      }
    } catch (err) {
      console.log("Token refresh failed:", err.message);
    }
  }

  let nowPlaying = null;

  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      { headers: { Authorization: `Bearer ${user.spotify_access_token}` } },
    );

    if (response.status === 200) {
      nowPlaying = await response.json();
    } else if (response.status === 204) {
      const recentRes = await fetch(
        "https://api.spotify.com/v1/me/player/recently-played?limit=1",
        { headers: { Authorization: `Bearer ${user.spotify_access_token}` } },
      );
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        if (recentData.items && recentData.items[0]) {
          nowPlaying = { item: recentData.items[0].track, isRecent: true };
        }
      }
    }
  } catch (err) {
    // Silent fail
  }

  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  let fitData = { steps: 0, heartRate: null, sleepHours: null };

  if (user.google_access_token) {
    fitData = await fetchGoogleFitData(
      user.google_access_token,
      startOfDay,
      now,
    );
  }

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data: recentCheckins } = await db
    .from("mood_checkins")
    .select("mood_label, note, mood_labels")
    .eq("user_id", userId)
    .gte("created_at", threeHoursAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  const recentCheckin = recentCheckins?.[0];

  const moodScore = computeMoodScore({
    moodLabel: recentCheckin ? getCheckinMoods(recentCheckin) || null : null,
    trackPopularity: nowPlaying?.item?.popularity ?? null,
    steps: fitData.steps,
  });

  const { data: lastSnapshots } = await db
    .from("mood_snapshots")
    .select("id, track_id, track_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastSnapshot = lastSnapshots?.[0];
  const trackId = nowPlaying?.item?.id || null;
  const trackName = nowPlaying?.item?.name || null;
  const artistName = nowPlaying?.item?.artists?.[0]?.name || null;
  const albumArt = nowPlaying?.item?.album?.images?.[0]?.url || null;

  const sameTrack = lastSnapshot?.track_id === trackId;
  const secondsSinceLast = lastSnapshot
    ? (Date.now() - new Date(lastSnapshot.created_at).getTime()) / 1000
    : Infinity;

  const shouldSkipInsert = sameTrack && secondsSinceLast < 300;

  const snapshotFields = {
    score: moodScore,
    valence: null,
    energy: null,
    steps: fitData.steps,
    heart_rate: fitData.heartRate,
    sleep_hours: fitData.sleepHours,
    track_id: trackId,
    track_name: trackName,
    artist_name: artistName,
    album_art: albumArt,
  };

  if (shouldSkipInsert && lastSnapshot?.id) {
    await db.from("mood_snapshots").update(snapshotFields).eq("id", lastSnapshot.id);
  } else {
    await db.from("mood_snapshots").insert({
      user_id: userId,
      created_at: new Date().toISOString(),
      ...snapshotFields,
    });
  }

  res.json({
    moodScore,
    integrations: {
      spotify: Boolean(user.spotify_access_token),
      googleFit: Boolean(user.google_access_token),
    },
    track: {
      name: trackName,
      artist: artistName,
      isRecent: Boolean(nowPlaying?.isRecent),
    },
    fitData,
  });
});

app.get("/api/mood/snapshots", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const db = getSupabaseAdmin();

  const { data: snapshots } = await db
    .from("mood_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: latest } = await db
    .from("mood_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  console.log("Latest snapshot:");
  console.log(latest?.[0]);
  res.json({ snapshots: snapshots || [] });
});

// ============================================
// 7. CHECK-IN ROUTES
// ============================================

app.post("/api/checkins", authRequired, async (req, res) => {
  const { mood, moods, note, shareWithFriends } = req.body;
  const db = getSupabaseAdmin();
  const moodList = Array.isArray(moods)
    ? moods
    : mood
      ? [mood]
      : [];
  const normalizedMoods = moodList.map(toMoodEnum).filter(Boolean);

  if (normalizedMoods.length === 0) {
    return res.status(400).json({ error: "At least one mood is required" });
  }

  const primaryMood = normalizedMoods[0];
  const finalNote = encodeCheckinNote(normalizedMoods, note || "");

  const payload = {
    user_id: req.user.userId,
    mood_label: primaryMood,
    note: finalNote,
    share_with_friends: shareWithFriends,
  };

  try {
    const { data, error } = await db
      .from("mood_checkins")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    res.json({ checkin: enrichCheckin(data) });
  } catch (err) {
    console.error("checkin save error:", err.message);
    res.status(500).json({ error: "Failed to save checkin" });
  }
});

app.get("/api/checkins", authRequired, async (req, res) => {
  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("mood_checkins")
      .select("*")
      .eq("user_id", req.user.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ checkins: (data || []).map(enrichCheckin) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch checkins" });
  }
});

app.get("/api/checkins/latest", authRequired, async (req, res) => {
  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("mood_checkins")
      .select("*")
      .eq("user_id", req.user.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json({ checkin: data ? enrichCheckin(data) : null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest checkin" });
  }
});

app.get("/api/checkins/week", authRequired, async (req, res) => {
  const db = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from("mood_checkins")
    .select("created_at, mood_label")
    .eq("user_id", req.user.userId)
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false });

  const rows = (data || []).map((r) => ({
    day: r.created_at?.slice(0, 10),
    mood_label: r.mood_label,
  }));

  res.json(rows);
});

app.get("/api/checkins/analytics", authRequired, async (req, res) => {
  const db = getSupabaseAdmin();
  try {
    const { data, error } = await db
      .from("mood_checkins")
      .select("mood_label")
      .eq("user_id", req.user.userId);

    if (error) throw error;

    const counts = {};
    for (const row of data || []) {
      const label = row.mood_label;
      counts[label] = (counts[label] || 0) + 1;
    }
    const stats = Object.entries(counts).map(([mood_label, count]) => ({
      mood_label,
      count,
    }));

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ============================================
// 8. AI FORECAST ROUTE
// ============================================

app.get("/api/forecast", authRequired, async (req, res) => {
  const userId = req.user.userId;

  const cached = getCached(forecastCache, userId);
  if (cached) {
    return res.json({ forecast: cached, source: "cache" });
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
          return res.json({ forecast, source: "ai" });
        }

        console.log("AI forecast invalid shape — using fallback");
      } catch (aiError) {
        console.log("AI forecast error:", aiError.message);
        const stale = getStaleCached(forecastCache, userId);
        if (stale) {
          return res.json({ forecast: stale, source: "cache" });
        }
      }
    }

    res.json({ forecast: MOCK_FORECAST, source: "mock" });
  } catch (err) {
    console.log("Forecast error:", err.message);
    const stale = getStaleCached(forecastCache, userId);
    if (stale) {
      return res.json({ forecast: stale, source: "cache" });
    }
    res.json({ forecast: MOCK_FORECAST, source: "fallback" });
  }
});

// ============================================
// 9. PERSONALITY INSIGHTS ROUTE
// ============================================

app.get("/api/insights/personality", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const db = getSupabaseAdmin();
  const MIN_CHECKINS = 5;

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
    return res.json({
      ...cached,
      checkinCount,
      snapshotCount,
      moodPattern: pattern,
    });
  }

  if (checkinCount < MIN_CHECKINS) {
    return res.json({
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
    const personality = extractJson(response.text());
    const payload = {
      source: "ai",
      checkinCount,
      snapshotCount,
      moodPattern: pattern,
      ocean: personality?.ocean || heuristicOcean(dist),
      mbti: personality?.mbti?.type ? personality.mbti : null,
      insights: Array.isArray(personality?.insights) ? personality.insights : [],
    };
    setCached(insightsCache, userId, payload);
    return res.json(payload);
  } catch (e) {
    console.log("Personality AI error:", e.message);
    return res.json({
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
});

// ============================================
// 10. MUSIC RECOMMENDATIONS ROUTE
// ============================================

app.get("/api/recs", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const db = getSupabaseAdmin();

  const { data: user } = await db
    .from("moodsync_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user?.spotify_access_token) {
    return res.json({
      recommendations: [],
      status: "spotify_not_connected",
      message: "Connect Spotify to see music picked for your mood.",
    });
  }

  let accessToken = user.spotify_access_token;

  if (
    (!user.spotify_token_expires ||
      new Date() > new Date(user.spotify_token_expires)) &&
    user.spotify_refresh_token
  ) {
    try {
      const refreshed = await refreshSpotifyToken(userId);
      if (refreshed) accessToken = refreshed;
    } catch (err) {
      console.log("Recs token refresh failed:", err.message);
    }
  }

  try {
    let topTracks = { items: [] };
    const topRes = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (topRes.status === 401) {
      return res.json({
        recommendations: [],
        status: "token_expired",
        message: "Your Spotify session expired. Reconnect to refresh recommendations.",
      });
    }
    if (topRes.ok) topTracks = await topRes.json();

    let recentTracks = { items: [] };
    const recentRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=20",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (recentRes.ok) recentTracks = await recentRes.json();

    const combined = [
      ...(topTracks.items || []),
      ...(recentTracks.items?.map((i) => i.track) || []),
    ];
    const seen = new Set();
    const deduped = combined.filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    if (deduped.length === 0) {
      return res.json({
        recommendations: [],
        status: "no_history",
        message:
          "No listening history yet. Play a few tracks on Spotify and check back — we'll learn your taste quickly.",
      });
    }

    const shuffled = deduped.sort(() => Math.random() - 0.5).slice(0, 12);

    const { data: latestCheckin } = await db
      .from("mood_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latest = latestCheckin ? enrichCheckin(latestCheckin) : null;
    const moods = latest?.mood_labels?.length
      ? latest.mood_labels
      : latest?.mood_label
        ? [latest.mood_label]
        : [];
    const prefer = energyFromMoods(moods);
    const rank = (band) => (band === prefer ? 0 : band === "medium" ? 1 : 2);

    const recommendations = shuffled
      .map((track) => {
        const energy = estimateTrackEnergy(track, prefer);
        const band = energyBand(energy);
        return {
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          external_urls: track.external_urls,
          popularity: track.popularity,
          energy,
          energy_band: band,
          reason: "",
        };
      })
      .sort((a, b) => rank(a.energy_band) - rank(b.energy_band))
      .map((track, index) => ({
        ...track,
        reason: reasonForTrack(moods, track.energy_band, index === 0),
      }));

    res.json({
      recommendations,
      status: "ok",
      mood: {
        labels: moods,
        energy_band: prefer,
      },
    });
  } catch (err) {
    console.log("Recs route error:", err.message);
    res.json({
      recommendations: [],
      status: "error",
      message: "We couldn't reach Spotify right now. Please try again.",
    });
  }
});

// ============================================
// 11. FRIENDS & SOCIAL ROUTES
// ============================================

app.get("/api/friends/requests", authRequired, async (req, res) => {
  try {
    const db = getSupabaseAdmin();
    const { data: follows, error } = await db
      .from("mood_follows")
      .select("follower_id")
      .eq("following_id", req.user.userId)
      .eq("status", "pending");

    if (error) throw error;

    const followerIds = (follows || []).map((f) => f.follower_id);
    if (followerIds.length === 0) {
      return res.json([]);
    }

    const { data: profiles, error: pErr } = await db
      .from("moodsync_profiles")
      .select("user_id, username")
      .in("user_id", followerIds);

    if (pErr) throw pErr;

    res.json(
      (profiles || []).map((u) => ({
        id: u.user_id,
        username: u.username,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friend requests" });
  }
});

app.delete(
  "/api/friends/request/:followerId",
  authRequired,
  async (req, res) => {
    try {
      const db = getSupabaseAdmin();
      await db
        .from("mood_follows")
        .delete()
        .eq("follower_id", req.params.followerId)
        .eq("following_id", req.user.userId)
        .eq("status", "pending");

      res.json({ deleted: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to ignore request" });
    }
  },
);

app.get("/api/users/search", authRequired, async (req, res) => {
  try {
    const q = req.query.q || "";
    const db = getSupabaseAdmin();

    const { data: users, error } = await db
      .from("moodsync_profiles")
      .select("user_id, username")
      .ilike("username", `%${q}%`)
      .neq("user_id", req.user.userId)
      .order("username")
      .limit(10);

    if (error) throw error;

    res.json(
      (users || []).map((u) => ({
        id: u.user_id,
        username: u.username,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to search users",
    });
  }
});

app.post("/api/friends/request", authRequired, async (req, res) => {
  const { targetUsername } = req.body;
  const db = getSupabaseAdmin();

  const { data: target } = await db
    .from("moodsync_profiles")
    .select("user_id, username")
    .eq("username", targetUsername)
    .maybeSingle();

  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }

  const { data: sender } = await db
    .from("moodsync_profiles")
    .select("username")
    .eq("user_id", req.user.userId)
    .maybeSingle();

  await db.from("mood_follows").upsert(
    {
      follower_id: req.user.userId,
      following_id: target.user_id,
      status: "pending",
    },
    { onConflict: "follower_id,following_id", ignoreDuplicates: true },
  );

  let targetEmail = null;
  try {
    const { data: authData } = await db.auth.admin.getUserById(target.user_id);
    targetEmail = authData?.user?.email ?? null;
  } catch (err) {
    console.log("Could not look up target email:", err.message);
  }

  if (targetEmail) {
    sendFriendRequestEmail(
      targetEmail,
      target.username,
      sender?.username || "Someone",
    );
  }

  res.json({ sent: true });
});

app.post("/api/friends/accept/:followerId", authRequired, async (req, res) => {
  const db = getSupabaseAdmin();

  await db
    .from("mood_follows")
    .update({ status: "accepted" })
    .eq("follower_id", req.params.followerId)
    .eq("following_id", req.user.userId);

  await db.from("mood_follows").upsert(
    {
      follower_id: req.user.userId,
      following_id: req.params.followerId,
      status: "accepted",
    },
    { onConflict: "follower_id,following_id", ignoreDuplicates: true },
  );

  res.json({ accepted: true });
});

app.get("/api/friends", authRequired, async (req, res) => {
  const db = getSupabaseAdmin();
  const userId = req.user.userId;

  const { data: outgoing } = await db
    .from("mood_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "accepted");

  const { data: incoming } = await db
    .from("mood_follows")
    .select("follower_id")
    .eq("following_id", userId)
    .eq("status", "accepted");

  const incomingSet = new Set((incoming || []).map((r) => r.follower_id));
  const mutualIds = (outgoing || [])
    .map((r) => r.following_id)
    .filter((id) => incomingSet.has(id));

  if (mutualIds.length === 0) {
    return res.json([]);
  }

  const { data: profiles } = await db
    .from("moodsync_profiles")
    .select("user_id, username")
    .in("user_id", mutualIds);

  const result = [];
  for (const u of profiles || []) {
    const { data: lastCheckin } = await db
      .from("mood_checkins")
      .select("mood_label, note, mood_labels")
      .eq("user_id", u.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    result.push({
      id: u.user_id,
      username: u.username,
      last_mood: lastCheckin ? getCheckinMoods(lastCheckin) : null,
    });
  }

  res.json(result);
});

app.get("/api/friends/:friendId/mood-trend", authRequired, async (req, res) => {
  const db = getSupabaseAdmin();
  const userId = req.user.userId;
  const friendId = req.params.friendId;

  const { data: a } = await db
    .from("mood_follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", friendId)
    .eq("status", "accepted")
    .maybeSingle();

  const { data: b } = await db
    .from("mood_follows")
    .select("follower_id")
    .eq("follower_id", friendId)
    .eq("following_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!a || !b) {
    return res.status(403).json({ error: "Not mutual friends" });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: snapshots } = await db
    .from("mood_snapshots")
    .select("created_at, score")
    .eq("user_id", friendId)
    .gte("created_at", weekAgo);

  const byDay = {};
  for (const s of snapshots || []) {
    const day = s.created_at?.slice(0, 10);
    if (!day) continue;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(Number(s.score) || 0);
  }

  const rows = Object.entries(byDay)
    .map(([day, scores]) => ({
      day,
      avg_score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((x, y) => x.day.localeCompare(y.day));

  res.json(rows);
});

app.put("/api/privacy", authRequired, async (req, res) => {
  const { share_mood, share_trends, share_ocean, share_music, share_fitness } =
    req.body;
  const db = getSupabaseAdmin();

  try {
    const { error } = await db
      .from("moodsync_profiles")
      .update({
        share_mood,
        share_trends,
        share_ocean,
        share_music,
        share_fitness,
      })
      .eq("user_id", req.user.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
});

app.get("/api/friends/pending", authRequired, async (req, res) => {
  try {
    const db = getSupabaseAdmin();
    const { data: follows, error } = await db
      .from("mood_follows")
      .select("following_id")
      .eq("follower_id", req.user.userId)
      .eq("status", "pending");

    if (error) throw error;

    const ids = (follows || []).map((f) => f.following_id);
    if (ids.length === 0) {
      return res.json([]);
    }

    const { data: profiles, error: pErr } = await db
      .from("moodsync_profiles")
      .select("user_id, username")
      .in("user_id", ids);

    if (pErr) throw pErr;

    res.json(
      (profiles || []).map((u) => ({
        id: u.user_id,
        username: u.username,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Unable to fetch pending requests",
    });
  }
});

// ============================================
// 12. HELPER FUNCTIONS
// ============================================

async function fetchGoogleFitData(accessToken, startMs, endMs) {
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

  return {
    steps:
      result.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0,
    heartRate:
      result.bucket?.[0]?.dataset?.[1]?.point?.[0]?.value?.[0]?.fpVal || null,
    sleepHours: null,
  };
}

function extractJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw new Error("Could not parse AI JSON response");
  }
}

async function sendFriendRequestEmail(toEmail, toUsername, fromUsername) {
  try {
    if (
      !process.env.AWS_SES_ACCESS_KEY_ID ||
      !process.env.AWS_SES_SECRET_ACCESS_KEY ||
      !process.env.AWS_SES_SENDER_EMAIL
    ) {
      console.log("SES not configured — skipping friend request email");
      return;
    }

    await ses
      .sendEmail({
        Source: process.env.AWS_SES_SENDER_EMAIL,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: {
            Data: `${fromUsername} sent you a friend request on MoodSync`,
          },
          Body: {
            Html: {
              Data: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #534AB7;">New Friend Request</h2>
          <p>Hi ${toUsername},</p>
          <p><strong>${fromUsername}</strong> just sent you a friend request on MoodSync.</p>
          <p>Log in to your account to accept or decline it.</p>
          <p style="color: #888; font-size: 12px; margin-top: 32px;">— The MoodSync Team</p>
        </div>
      `,
            },
          },
        },
      })
      .promise();
  } catch (err) {
    console.log("Failed to send friend request email:", err.message);
  }
}

async function generateWithRetry(prompt, retries = 2, delayMs = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return await result.response;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      const isTransient =
        err.message?.includes("503") || err.message?.includes("overloaded");
      if (isLastAttempt || !isTransient) throw err;
      console.log(
        `Gemini call failed (attempt ${attempt + 1}/${retries + 1}), retrying...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function moodLabelToScore(label) {
  const map = {
    excited: 90,
    Excited: 90,
    happy: 85,
    Happy: 85,
    grateful: 80,
    Grateful: 80,
    focused: 70,
    Focused: 70,
    calm: 65,
    Calm: 65,
    tired: 35,
    Tired: 35,
    anxious: 25,
    Anxious: 25,
    sad: 20,
    Sad: 20,
    low: 20,
    Low: 20,
    stressed: 15,
    Stressed: 15,
  };
  return map[label] ?? map[String(label || "").toLowerCase()] ?? 50;
}

function moodsLabelToScore(label) {
  if (!label) return null;
  const parts = String(label)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const scores = parts.map((part) => moodLabelToScore(part));
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

function computeMoodScore({ moodLabel, trackPopularity, steps }) {
  const components = [];

  const moodScore = moodsLabelToScore(moodLabel);
  if (moodScore != null) {
    components.push({ value: moodScore, weight: 0.5 });
  }
  if (typeof trackPopularity === "number") {
    components.push({ value: trackPopularity, weight: 0.2 });
  }
  if (typeof steps === "number" && steps > 0) {
    components.push({
      value: Math.round(Math.min(steps / 10000, 1) * 100),
      weight: 0.2,
    });
  }

  if (components.length === 0) return 50;

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weighted = components.reduce((s, c) => s + c.value * c.weight, 0);
  return Math.round(weighted / totalWeight);
}

async function refreshSpotifyToken(userId) {
  const db = getSupabaseAdmin();
  const { data: user } = await db
    .from("moodsync_profiles")
    .select("spotify_refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user || !user.spotify_refresh_token) {
    console.log("No refresh token available for user:", userId);
    return null;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.spotify_refresh_token,
    }),
  });

  const data = await response.json();

  if (!data.access_token) {
    console.log("Failed to refresh token:", data);
    return null;
  }

  await db
    .from("moodsync_profiles")
    .update({
      spotify_access_token: data.access_token,
      spotify_token_expires: new Date(
        Date.now() + data.expires_in * 1000,
      ).toISOString(),
    })
    .eq("user_id", userId);

  return data.access_token;
}

function aggregateFeatures(snapshots) {
  if (!snapshots.length) return {};
  const avg = (key) =>
    snapshots.reduce((s, r) => s + (r[key] || 0), 0) / snapshots.length;
  return {
    valence: avg("valence").toFixed(2),
    energy: avg("energy").toFixed(2),
    steps: Math.round(avg("steps")),
  };
}

function moodDistribution(checkins) {
  return (checkins || []).reduce((acc, c) => {
    const enriched = enrichCheckin(c);
    const labels = enriched.mood_labels?.length
      ? enriched.mood_labels
      : enriched.mood_label
        ? [enriched.mood_label]
        : [];
    labels.forEach((raw) => {
      const key = String(raw).trim().toLowerCase();
      if (!key) return;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
}

function moodPatternFromDist(dist) {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

function heuristicOcean(dist) {
  const total = Object.values(dist).reduce((sum, n) => sum + n, 0) || 1;
  const share = (key) => (dist[key] || 0) / total;
  const clamp = (n) => Math.max(8, Math.min(92, Math.round(n)));
  return {
    O: clamp(48 + share("excited") * 30 + share("happy") * 10),
    C: clamp(50 + share("focused") * 35 - share("tired") * 12),
    E: clamp(
      45 +
        (share("happy") + share("excited")) * 30 -
        (share("calm") + share("low")) * 15,
    ),
    A: clamp(50 + share("calm") * 25 - share("stressed") * 15),
    N: clamp(35 + (share("anxious") + share("stressed") + share("low")) * 40),
  };
}

function fitnessPatterns(snapshots) {
  const byHour = {};
  snapshots.forEach((s) => {
    const h = new Date(s.created_at).getHours();
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(s.score);
  });
  return Object.fromEntries(
    Object.entries(byHour).map(([h, scores]) => [
      h,
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    ]),
  );
}

export default app;
