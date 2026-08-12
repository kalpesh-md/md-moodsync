/**
 * MoodSync Backend — Express API (mounted via App Router catch-all).
 */

// @ts-nocheck — gradual typing; handlers keep runtime behavior.

import express from "express";
import helmet from "helmet";
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AWS from "aws-sdk";

AWS.config.update({
  accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  region: process.env.AWS_SES_REGION || "ap-south-1",
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

const app = express();

// Middleware
app.use(express.json());
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
  });
});

app.use(helmet({ contentSecurityPolicy: false }));

// Database & Cache connections
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Simple in-memory cache for AI-generated content, keyed by userId.
// Avoids re-calling Gemini on every tab visit. Resets on server restart.
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

function setCached(cache, userId, data) {
  cache.set(userId, { data, timestamp: Date.now() });
}

// ============================================
// 2. AUTHENTICATION MIDDLEWARE
// ============================================

function authRequired(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
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
    const user = await db.query(
      "SELECT id, email, username, share_mood, share_trends, share_ocean, share_music, share_fitness FROM users WHERE id = $1",
      [req.user.userId],
    );
    res.json({ user: user.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res
      .status(400)
      .json({ error: "Email, username, and password are required" });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1,$2,$3) RETURNING id",
      [email, username, hash],
    );
    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({ token });
  } catch (err) {
    if (err.code === "23505") {
      // Postgres unique_violation — email or username already taken
      return res
        .status(409)
        .json({ error: "Email or username already in use" });
    }
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await db.query("SELECT * FROM users WHERE email=$1", [email]);

    if (!user.rows[0]) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.rows[0].id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({
      token,
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed. Please try again." });
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

  const url =
    `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code&redirect_uri=${process.env.SPOTIFY_REDIRECT_URI}` +
    `&scope=${encodeURIComponent(scopes)}&state=${req.user.userId}`;

  res.json({ url });
});

app.get("/api/spotify/callback", async (req, res) => {
  const { code, state: userId } = req.query;

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
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    }),
  });

  const tokens = await response.json();

  await db.query(
    "UPDATE users SET spotify_access_token=$1, spotify_refresh_token=$2, spotify_token_expires=$3 WHERE id=$4",
    [
      tokens.access_token,
      tokens.refresh_token,
      new Date(Date.now() + tokens.expires_in * 1000),
      userId,
    ],
  );

  res.redirect(`${process.env.CLIENT_URL}/?connected=spotify`);
});

app.get("/api/spotify/status", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const user = (await db.query("SELECT * FROM users WHERE id=$1", [userId]))
    .rows[0];

  if (!user.spotify_access_token) {
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

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&response_type=code` +
    `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline&prompt=consent&state=${req.user.userId}`;

  res.json({ url });
});

app.get("/api/fit/callback", async (req, res) => {
  const { code, state: userId } = req.query;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await response.json();

  await db.query(
    `UPDATE users SET 
      google_access_token = $1, 
      google_refresh_token = $2, 
      google_token_expires = $3 
     WHERE id = $4`,
    [
      tokens.access_token,
      tokens.refresh_token,
      new Date(Date.now() + tokens.expires_in * 1000),
      userId,
    ],
  );

  res.redirect(`${process.env.CLIENT_URL}/?connected=googlefit`);
});

// ============================================
// 6. MOOD SYNC ROUTE
// ============================================

app.post("/api/mood/sync", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const user = (await db.query("SELECT * FROM users WHERE id=$1", [userId]))
    .rows[0];

  // Refresh Spotify token if expired
  if (
    (!user.spotify_token_expires || new Date() > user.spotify_token_expires) &&
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

  // Fetch current playing or recently played track
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

  // Fetch Google Fit data
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

  // Fetch the user's most recent check-in (within the last 3 hours) —
  // self-reported mood is our most reliable signal for the score.
  const recentCheckin = (
    await db.query(
      `SELECT mood_label FROM checkins
       WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '3 hours'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    )
  ).rows[0];

  const moodScore = computeMoodScore({
    moodLabel: recentCheckin?.mood_label || null,
    trackPopularity: nowPlaying?.item?.popularity ?? null,
    steps: fitData.steps,
  });

  const lastSnapshot = (
    await db.query(
      "SELECT track_id, created_at FROM mood_snapshots WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
      [userId],
    )
  ).rows[0];

  const sameTrack = lastSnapshot?.track_id === (nowPlaying?.item?.id || null);
  const secondsSinceLast = lastSnapshot
    ? (Date.now() - new Date(lastSnapshot.created_at).getTime()) / 1000
    : Infinity;

  const shouldSkipInsert = sameTrack && secondsSinceLast < 300; // same song, <5 min ago

  if (!shouldSkipInsert) {
    await db.query(
      `INSERT INTO mood_snapshots 
      (user_id, score, valence, energy, steps, heart_rate, sleep_hours, track_id, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [
        userId,
        moodScore,
        null,
        null,
        fitData.steps,
        fitData.heartRate,
        fitData.sleepHours,
        nowPlaying?.item?.id || null,
      ],
    );
  }

  res.json({
    moodScore,
    track: {
      name: nowPlaying?.item?.name || null,
      artist: nowPlaying?.item?.artists?.[0]?.name || null,
    },
    fitData,
  });
});

app.get("/api/mood/snapshots", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const snapshots = await db.query(
    `SELECT * FROM mood_snapshots WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  const latest = await db.query(
    `SELECT *
    FROM mood_snapshots
    WHERE user_id=$1
    ORDER BY created_at DESC
    LIMIT 1`,
    [userId],
  );
  console.log("Latest snapshot:");
  console.log(latest.rows[0]);
  res.json({ snapshots: snapshots.rows });
});

// ============================================
// 7. CHECK-IN ROUTES
// ============================================

app.post("/api/checkins", authRequired, async (req, res) => {
  const { mood, note, shareWithFriends } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO checkins (user_id, mood_label, note, share_with_friends)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, mood, note, shareWithFriends],
    );
    res.json({ checkin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to save checkin" });
  }
});

app.get("/api/checkins", authRequired, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM checkins WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId],
    );
    res.json({ checkins: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch checkins" });
  }
});

app.get("/api/checkins/latest", authRequired, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM checkins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.userId],
    );
    res.json({ checkin: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest checkin" });
  }
});

app.get("/api/checkins/week", authRequired, async (req, res) => {
  const rows = await db.query(
    `SELECT DATE(created_at) as day, mood_label FROM checkins
     WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC`,
    [req.user.userId],
  );
  res.json(rows.rows);
});

app.get("/api/checkins/analytics", authRequired, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT mood_label, COUNT(*) as count
       FROM checkins WHERE user_id = $1 GROUP BY mood_label`,
      [req.user.userId],
    );
    res.json({ stats: result.rows });
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
    return res.json(cached);
  }

  try {
    const snapshots = await db.query(
      `SELECT * FROM mood_snapshots WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at`,
      [userId],
    );
    const checkins = await db.query(
      `SELECT * FROM checkins WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at`,
      [userId],
    );

    // Return mock forecast if no AI key or AI fails
    const mockForecast = [
      {
        timeLabel: "Next 2 hours",
        predictedMood: "Focused",
        confidence: 75,
        doNow: ["Take a break", "Stay hydrated"],
        avoid: ["Multitasking"],
        drivers: [{ key: "energy", val: 0.6, sentiment: "positive" }],
      },
      {
        timeLabel: "Tonight (7-10pm)",
        predictedMood: "Calm",
        confidence: 70,
        doNow: ["Relax", "Listen to music"],
        avoid: ["Caffeine"],
        drivers: [{ key: "valence", val: 0.5, sentiment: "neutral" }],
      },
      {
        timeLabel: "Tomorrow Morning (8-11am)",
        predictedMood: "Energetic",
        confidence: 80,
        doNow: ["Plan your day", "Exercise"],
        avoid: ["Skipping breakfast"],
        drivers: [{ key: "steps", val: 0.7, sentiment: "positive" }],
      },
    ];

    // Try AI, but return mock if it fails
    if (
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "your_gemini_key"
    ) {
      try {
        const systemPrompt = `You are a mood prediction engine. Given a user's music listening data, 
        fitness data, and self-reported check-ins from the past 7 days, predict their mood for the next 
        3 time windows: next 2 hours, tonight (7-10pm), and tomorrow morning (8-11am).

        For each window return JSON:
        { timeLabel, predictedMood, confidence (0-100), doNow: string[], avoid: string[], 
          drivers: [{key, val, sentiment: "positive"|"neutral"|"negative"}] }

        Return only a JSON array, no markdown.`;

        const prompt = `
        ${systemPrompt}

        Mood snapshots:
        ${JSON.stringify(snapshots.rows.slice(-20), null, 2)}

        Check-ins:
        ${JSON.stringify(checkins.rows, null, 2)}

        Current time:
        ${new Date().toISOString()}
        `;

       const response = await generateWithRetry(prompt);

        const text = response.text();

        const forecast = extractJson(text);

        setCached(forecastCache, userId, forecast);
        return res.json(forecast);
      } catch (aiError) {
        console.log("AI Error, using mock forecast:", aiError.message);
        console.log("AI Error full:", aiError);
      }
    }

    // Return mock forecast
    res.json(mockForecast);
  } catch (err) {
    console.log("Forecast error:", err.message);
    // Return mock forecast on error
    res.json([
      {
        timeLabel: "Next 2 hours",
        predictedMood: "Focused",
        confidence: 75,
        doNow: ["Take a break"],
        avoid: ["Multitasking"],
      },
      {
        timeLabel: "Tonight",
        predictedMood: "Calm",
        confidence: 70,
        doNow: ["Relax"],
        avoid: ["Caffeine"],
      },
      {
        timeLabel: "Tomorrow Morning",
        predictedMood: "Energetic",
        confidence: 80,
        doNow: ["Plan your day"],
        avoid: ["Skipping breakfast"],
      },
    ]);
  }
});

// ============================================
// 9. PERSONALITY INSIGHTS ROUTE
// ============================================

app.get("/api/insights/personality", authRequired, async (req, res) => {
  const userId = req.user.userId;

  const cached = getCached(insightsCache, userId);
  if (cached) {
    return res.json(cached);
  }

  const snapshots = await db.query(
    "SELECT * FROM mood_snapshots WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
    [userId],
  );
  const checkins = await db.query(
    "SELECT * FROM checkins WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
    [userId],
  );

  const systemPrompt = `You are a psychometric inference engine. Based on a user's music audio features, fitness patterns, and self-reported moods, estimate:
1. Big Five OCEAN scores (0-100 each)
2. Most likely MBTI type (4-letter code + confidence)
3. MBTI axis leanings as percentages toward the SECOND letter of each pair (e.g. IE: 65 means 65% leaning Extraversion)
4. 3 personalized insight strings

Return only JSON: { ocean: {O,C,E,A,N}, mbti: {type, confidence, axes: {IE, NS, TF, JP}}, insights: [{head, body, color}] }`;
  let personality;

  try {
    const prompt = `
    ${systemPrompt}

    Audio feature averages:
    ${JSON.stringify(aggregateFeatures(snapshots.rows), null, 2)}

    Mood distribution:
    ${JSON.stringify(moodDistribution(checkins.rows), null, 2)}

    Fitness patterns:
    ${JSON.stringify(fitnessPatterns(snapshots.rows), null, 2)}
    `;

    const response = await generateWithRetry(prompt);

    personality = extractJson(response.text());
    setCached(insightsCache, userId, personality);
  } catch (e) {
    console.log("Personality AI error:", e.message);
    personality = {
      ocean: { O: 60, C: 65, E: 55, A: 50, N: 40 },
      mbti: { type: "INTJ", confidence: 50 },
      insights: [
        {
          head: "Not enough data yet",
          body: "Add more check-ins to improve insights accuracy.",
        },
      ],
    };
  }

  res.json(personality);
});

// ============================================
// 10. MUSIC RECOMMENDATIONS ROUTE
// ============================================

app.get("/api/recs", authRequired, async (req, res) => {
  const userId = req.user.userId;
  const user = (await db.query("SELECT * FROM users WHERE id=$1", [userId]))
    .rows[0];

  if (!user.spotify_access_token) {
    return res.json({ recommendations: [], error: "Spotify not connected" });
  }

  try {
    // Spotify deprecated /v1/recommendations and /v1/audio-features for
    // apps without Extended Quota Mode (Nov 2024). We build recs from
    // top tracks + recently played instead, which are still available.
    let topTracks = { items: [] };
    const topRes = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term",
      { headers: { Authorization: `Bearer ${user.spotify_access_token}` } },
    );
    if (topRes.ok) topTracks = await topRes.json();

    let recentTracks = { items: [] };
    const recentRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=20",
      { headers: { Authorization: `Bearer ${user.spotify_access_token}` } },
    );
    if (recentRes.ok) recentTracks = await recentRes.json();

    // Merge top tracks + recently played, dedupe by track id
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
        error: "No listening history yet. Play some music on Spotify!",
      });
    }

    // Shuffle so it doesn't look identical every time, cap at 12
    const shuffled = deduped.sort(() => Math.random() - 0.5).slice(0, 12);

    res.json({ recommendations: shuffled });
  } catch (err) {
    console.log("Recs route error:", err.message);
    res.json({ recommendations: [], error: "Failed to load recommendations" });
  }
});

// ============================================
// 11. FRIENDS & SOCIAL ROUTES
// ============================================

app.get("/api/friends/requests", authRequired, async (req, res) => {
  try {
    const requests = await db.query(
      `
      SELECT
        u.id,
        u.username,
        u.avatar_url
      FROM follows f
      JOIN users u
        ON u.id = f.follower_id
      WHERE
        f.following_id = $1
        AND f.status = 'pending'
      `,
      [req.user.userId],
    );

    res.json(requests.rows);
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
      await db.query(
        `DELETE FROM follows
       WHERE follower_id = $1
       AND following_id = $2
       AND status = 'pending'`,
        [req.params.followerId, req.user.userId],
      );

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

    const users = await db.query(
      `
      SELECT
        id,
        username,
        avatar_url
      FROM users
      WHERE
        username ILIKE $1
        AND id != $2
      ORDER BY username
      LIMIT 10
      `,
      [`%${q}%`, req.user.userId],
    );

    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to search users",
    });
  }
});

app.post("/api/friends/request", authRequired, async (req, res) => {
  const { targetUsername } = req.body;

  const target = await db.query(
    "SELECT id, username, email FROM users WHERE username=$1",
    [targetUsername],
  );

  if (!target.rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  const sender = await db.query("SELECT username FROM users WHERE id=$1", [
    req.user.userId,
  ]);

  await db.query(
    "INSERT INTO follows (follower_id, following_id, status) VALUES ($1,$2,'pending') ON CONFLICT DO NOTHING",
    [req.user.userId, target.rows[0].id],
  );

  // Fire-and-forget — don't block the response on email delivery
  sendFriendRequestEmail(
    target.rows[0].email,
    target.rows[0].username,
    sender.rows[0].username,
  );

  res.json({ sent: true });
});

app.post("/api/friends/accept/:followerId", authRequired, async (req, res) => {
  await db.query(
    "UPDATE follows SET status='accepted' WHERE follower_id=$1 AND following_id=$2",
    [req.params.followerId, req.user.userId],
  );

  await db.query(
    "INSERT INTO follows (follower_id, following_id, status) VALUES ($1,$2,'accepted') ON CONFLICT DO NOTHING",
    [req.user.userId, req.params.followerId],
  );

  res.json({ accepted: true });
});

app.get("/api/friends", authRequired, async (req, res) => {
  const rows = await db.query(
    `SELECT u.id, u.username, u.avatar_url,
       (SELECT mood_label FROM checkins WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) as last_mood
     FROM follows f1
     JOIN follows f2 ON f2.follower_id=f1.following_id AND f2.following_id=f1.follower_id
     JOIN users u ON u.id=f1.following_id
     WHERE f1.follower_id=$1 AND f1.status='accepted' AND f2.status='accepted'`,
    [req.user.userId],
  );
  res.json(rows.rows);
});

app.get("/api/friends/:friendId/mood-trend", authRequired, async (req, res) => {
  const mutual = await db.query(
    `SELECT 1 FROM follows f1 JOIN follows f2
     ON f2.follower_id=f1.following_id AND f2.following_id=f1.follower_id
     WHERE f1.follower_id=$1 AND f1.following_id=$2`,
    [req.user.userId, req.params.friendId],
  );

  if (!mutual.rows[0]) {
    return res.status(403).json({ error: "Not mutual friends" });
  }

  const rows = await db.query(
    `SELECT DATE(created_at) as day, AVG(score) as avg_score
     FROM mood_snapshots WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days'
     GROUP BY DATE(created_at) ORDER BY day`,
    [req.params.friendId],
  );
  res.json(rows.rows);
});

app.put("/api/privacy", authRequired, async (req, res) => {
  const { share_mood, share_trends, share_ocean, share_music, share_fitness } =
    req.body;

  try {
    await db.query(
      `UPDATE users
       SET
         share_mood=$1,
         share_trends=$2,
         share_ocean=$3,
         share_music=$4,
         share_fitness=$5
       WHERE id=$6`,
      [
        share_mood,
        share_trends,
        share_ocean,
        share_music,
        share_fitness,
        req.user.userId,
      ],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
});

app.get("/api/friends/pending", authRequired, async (req, res) => {
  try {
    const rows = await db.query(
      `
      SELECT u.id, u.username
      FROM follows f
      JOIN users u ON u.id = f.following_id
      WHERE
        f.follower_id = $1
        AND f.status = 'pending'
      `,
      [req.user.userId],
    );

    res.json(rows.rows);
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
// Gemini sometimes wraps JSON responses in markdown code fences
// (```json ... ```) even when told not to. Strip them before parsing.
function extractJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  return JSON.parse(cleaned);
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
    // Email failure shouldn't break the friend request itself
    console.log("Failed to send friend request email:", err.message);
  }
}
// Retries a Gemini call up to `retries` times on transient errors (like 503s),
// with a short delay between attempts.
async function generateWithRetry(prompt, retries = 2, delayMs = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return await result.response;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      const isTransient = err.message?.includes("503") || err.message?.includes("overloaded");
      if (isLastAttempt || !isTransient) throw err;
      console.log(`Gemini call failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
// Maps a self-reported mood label to a 0-100 baseline score.
function moodLabelToScore(label) {
  const map = {
    Excited: 90, Happy: 85, Grateful: 80, Focused: 70, Calm: 65,
    Tired: 35, Anxious: 25, Sad: 20, Stressed: 15,
  };
  return map[label] ?? 50;
}

// Computes mood score from whatever real signals are actually available.
// Spotify deprecated /v1/audio-features (Nov 2024), so we no longer fake
// valence/energy — we use self-reported mood (most reliable), track
// popularity (weak energy proxy), and steps, each weighted by confidence.
function computeMoodScore({ moodLabel, trackPopularity, steps }) {
  const components = [];

  if (moodLabel) {
    components.push({ value: moodLabelToScore(moodLabel), weight: 0.5 });
  }
  if (typeof trackPopularity === "number") {
    components.push({ value: trackPopularity, weight: 0.2 });
  }
  if (typeof steps === "number") {
    components.push({ value: Math.min(steps / 10000, 1) * 100, weight: 0.2 });
  }

  if (components.length === 0) return 50; // honest neutral default, no data at all

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weighted = components.reduce((s, c) => s + c.value * c.weight, 0);
  return Math.round(weighted / totalWeight);
}

async function refreshSpotifyToken(userId) {
  const user = (
    await db.query("SELECT spotify_refresh_token FROM users WHERE id=$1", [
      userId,
    ])
  ).rows[0];

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

  await db.query(
    "UPDATE users SET spotify_access_token=$1, spotify_token_expires=$2 WHERE id=$3",
    [data.access_token, new Date(Date.now() + data.expires_in * 1000), userId],
  );

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
  return checkins.reduce((acc, c) => {
    acc[c.mood_label] = (acc[c.mood_label] || 0) + 1;
    return acc;
  }, {});
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
