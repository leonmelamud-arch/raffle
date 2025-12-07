-- HypnoRaffle Session System Migration
-- Run this SQL in your Supabase SQL Editor to set up sessions

-- ============================================
-- 1. CREATE SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- 2. DROP AND RECREATE PARTICIPANTS TABLE
-- ============================================
-- WARNING: This will delete all existing participants!
DROP TABLE IF EXISTS participants;

CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE
);

-- ============================================
-- 3. CREATE INDEX FOR FASTER LOOKUPS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sessions (needed for validation)
DROP POLICY IF EXISTS "Allow public read access to sessions" ON sessions;
CREATE POLICY "Allow public read access to sessions"
ON sessions FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anyone to insert sessions (needed for creating new sessions)
DROP POLICY IF EXISTS "Allow public insert access to sessions" ON sessions;
CREATE POLICY "Allow public insert access to sessions"
ON sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ============================================
-- 5. PARTICIPANTS POLICIES
-- ============================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to participants" ON participants;
CREATE POLICY "Allow public read access to participants"
ON participants FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public insert access to participants" ON participants;
CREATE POLICY "Allow public insert access to participants"
ON participants FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES (optional, run to verify)
-- ============================================
-- Check tables exist:
-- SELECT * FROM sessions LIMIT 1;
-- SELECT * FROM participants LIMIT 1;

-- Check columns:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'participants';
