-- MoodSync Database Schema
-- Run with: psql $DATABASE_URL < schema.sql

-- ============================================
-- 1. MOOD ENUM (optional but recommended)
-- ============================================
CREATE TYPE mood_enum AS ENUM ('happy', 'focused', 'calm', 'low', 'anxious', 'stressed', 'excited', 'tired');

-- ============================================
-- 2. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id                      SERIAL PRIMARY KEY,
  email                   TEXT UNIQUE NOT NULL,
  username                TEXT UNIQUE NOT NULL,
  password_hash           TEXT NOT NULL,
  avatar_url              TEXT,
  display_name            TEXT,  -- For showing name instead of email
  last_login              TIMESTAMPTZ,
  is_active               BOOLEAN DEFAULT true,

  -- Spotify OAuth
  spotify_access_token    TEXT,
  spotify_refresh_token   TEXT,
  spotify_token_expires   TIMESTAMPTZ,

  -- Google Fit OAuth
  google_access_token     TEXT,
  google_refresh_token    TEXT,
  google_token_expires    TIMESTAMPTZ,

  -- Privacy settings
  share_mood              BOOLEAN DEFAULT true,
  share_trends            BOOLEAN DEFAULT true,
  share_ocean             BOOLEAN DEFAULT false,
  share_music             BOOLEAN DEFAULT true,
  share_fitness           BOOLEAN DEFAULT false,

  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. MOOD SNAPSHOTS (Auto from Spotify + Fit)
-- ============================================
CREATE TABLE IF NOT EXISTS mood_snapshots (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  score         SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  
  -- Spotify audio features
  valence       NUMERIC(4,3),
  energy        NUMERIC(4,3),
  danceability  NUMERIC(4,3),
  tempo         NUMERIC(6,2),
  track_id      TEXT,
  track_name    TEXT,        -- For better UI display
  artist_name   TEXT,
  album_art     TEXT,        -- URL to album image

  -- Fit signals
  steps         INTEGER,
  heart_rate    NUMERIC(5,1),
  sleep_hours   NUMERIC(4,2),

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_snapshots_user_date ON mood_snapshots(user_id, created_at DESC);
CREATE INDEX idx_mood_snapshots_score ON mood_snapshots(user_id, score);

-- ============================================
-- 4. SELF CHECK-INS
-- ============================================
CREATE TABLE IF NOT EXISTS checkins (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
  mood_label          mood_enum NOT NULL,
  note                TEXT,
  share_with_friends  BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_user_date ON checkins(user_id, created_at DESC);

-- ============================================
-- 5. SOCIAL GRAPH (Friend System)
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  following_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id, status);
CREATE INDEX idx_follows_mutual ON follows(follower_id, following_id, status);