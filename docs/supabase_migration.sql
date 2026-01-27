-- =====================================================
-- Supabase Migration: Add raffle session support
-- =====================================================
-- Run this in your Supabase SQL Editor to fix the schema
-- 
-- Current issues:
-- 1. sessions table missing 'name' column
-- 2. No raffle_qr_refs table for session QR codes
-- 3. No create_session_with_qr function
-- =====================================================

-- =====================================================
-- STEP 1: Add 'name' column to sessions table
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN name TEXT;
    END IF;
END $$;

-- =====================================================
-- STEP 2: Create raffle_qr_refs table for session QR codes
-- (Separate from the existing qr_refs which is for personal QR codes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.raffle_qr_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    short_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.raffle_qr_refs ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Raffle QR refs are viewable by everyone" ON public.raffle_qr_refs;
CREATE POLICY "Raffle QR refs are viewable by everyone" ON public.raffle_qr_refs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Raffle QR refs are insertable by everyone" ON public.raffle_qr_refs;
CREATE POLICY "Raffle QR refs are insertable by everyone" ON public.raffle_qr_refs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Raffle QR refs are updatable by everyone" ON public.raffle_qr_refs;
CREATE POLICY "Raffle QR refs are updatable by everyone" ON public.raffle_qr_refs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Raffle QR refs are deletable by everyone" ON public.raffle_qr_refs;
CREATE POLICY "Raffle QR refs are deletable by everyone" ON public.raffle_qr_refs FOR DELETE USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_raffle_qr_refs_session ON public.raffle_qr_refs(session_id);
CREATE INDEX IF NOT EXISTS idx_raffle_qr_refs_short_code ON public.raffle_qr_refs(short_code);

-- =====================================================
-- STEP 3: Create helper functions
-- =====================================================

-- Function to generate short codes
CREATE OR REPLACE FUNCTION public.generate_short_code(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a session with QR ref
CREATE OR REPLACE FUNCTION public.create_session_with_qr(session_name TEXT DEFAULT NULL)
RETURNS TABLE(session_id UUID, short_code TEXT) AS $$
DECLARE
    new_session_id UUID;
    new_short_code TEXT;
BEGIN
    -- Create session
    INSERT INTO public.sessions (name, is_active) VALUES (session_name, true) RETURNING id INTO new_session_id;
    
    -- Generate unique short code
    LOOP
        new_short_code := public.generate_short_code(6);
        BEGIN
            INSERT INTO public.raffle_qr_refs (session_id, short_code) VALUES (new_session_id, new_short_code);
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            -- Try again with a new code
        END;
    END LOOP;
    
    RETURN QUERY SELECT new_session_id, new_short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Sessions policies (ensure they exist)
-- =====================================================
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.sessions;
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sessions are insertable by everyone" ON public.sessions;
CREATE POLICY "Sessions are insertable by everyone" ON public.sessions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Sessions are updatable by everyone" ON public.sessions;
CREATE POLICY "Sessions are updatable by everyone" ON public.sessions FOR UPDATE USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 5: Participants policies (ensure they exist)
-- =====================================================
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON public.participants;
CREATE POLICY "Participants are viewable by everyone" ON public.participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Participants are insertable by everyone" ON public.participants;
CREATE POLICY "Participants are insertable by everyone" ON public.participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Participants are updatable by everyone" ON public.participants;
CREATE POLICY "Participants are updatable by everyone" ON public.participants FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Participants are deletable by everyone" ON public.participants;
CREATE POLICY "Participants are deletable by everyone" ON public.participants FOR DELETE USING (true);

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
-- 
-- After running this migration, the app will use:
-- - public.sessions (with new 'name' column)
-- - public.raffle_qr_refs (new table for session QR codes)
-- - public.participants (existing table)
-- - public.create_session_with_qr() function
-- =====================================================
