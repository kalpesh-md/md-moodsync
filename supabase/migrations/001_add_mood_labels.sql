-- Optional: native multi-mood storage (app falls back to note encoding without this).
ALTER TABLE mood_checkins
  ADD COLUMN IF NOT EXISTS mood_labels TEXT[];
