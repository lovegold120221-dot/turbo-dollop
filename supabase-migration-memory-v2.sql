-- ── Beatrice Memory v2: Dynamic, Timestamp-Aware Memory System ──
-- Run this in Supabase SQL Editor after the base migrations.

-- 1. Upgrade memories table with new fields
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual_note';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'fact';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS importance_score REAL DEFAULT 1.0;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS recency_score REAL DEFAULT 1.0;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 1.0;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_timestamp TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE memories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT false;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS supersedes_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS superseded_by_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Indexes for the new schema
CREATE INDEX IF NOT EXISTS idx_memories_user_stale ON memories(user_id, is_stale);
CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source);
CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memories_event_time ON memories(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_memories_recency ON memories(recency_score DESC);
CREATE INDEX IF NOT EXISTS idx_memories_expires ON memories(expires_at) WHERE expires_at IS NOT NULL;

-- 3. Session summaries table
CREATE TABLE IF NOT EXISTS session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  summary TEXT NOT NULL,
  covered_start_at TIMESTAMPTZ,
  covered_end_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT now(),
  source_message_count INTEGER DEFAULT 0,
  source_message_ids UUID[] DEFAULT '{}',
  is_complete BOOLEAN DEFAULT false,
  is_stale BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_user ON session_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_session ON session_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_end ON session_summaries(session_end DESC);

-- 4. Add session_id to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 5. RLS for session_summaries
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own session summaries" ON session_summaries;
CREATE POLICY "Users can read own session summaries"
  ON session_summaries FOR SELECT
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own session summaries" ON session_summaries;
CREATE POLICY "Users can insert own session summaries"
  ON session_summaries FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own session summaries" ON session_summaries;
CREATE POLICY "Users can update own session summaries"
  ON session_summaries FOR UPDATE
  USING (user_id = auth.uid()::text);

-- 6. Add user timezone column
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS timezone TEXT;
