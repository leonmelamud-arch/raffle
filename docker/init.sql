-- ===========================================
-- PostgreSQL + PostgREST Initialization Script
-- ===========================================
-- This script initializes the database with required tables and roles

-- Create roles for PostgREST
CREATE ROLE web_anon NOLOGIN;
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'mysecretpassword';
GRANT web_anon TO authenticator;

-- ===========================================
-- 1. Create Tables
-- ===========================================

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create participants table
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  won BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON public.participants(session_id);

-- Create qr_refs table (for QR code references)
CREATE TABLE IF NOT EXISTS public.qr_refs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_qr_refs_ref_code ON public.qr_refs(ref_code);

-- ===========================================
-- 2. Grant Permissions to web_anon
-- ===========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO web_anon;

-- Grant permissions on sessions table
GRANT SELECT, INSERT, UPDATE ON public.sessions TO web_anon;

-- Grant permissions on participants table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO web_anon;

-- Grant permissions on qr_refs table
GRANT SELECT, INSERT, UPDATE ON public.qr_refs TO web_anon;

-- Grant sequence usage (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_anon;

-- ===========================================
-- 3. Insert Sample Data (Optional)
-- ===========================================

-- Create a default session
INSERT INTO public.sessions (id, is_active) 
VALUES ('00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Database initialization complete!';
  RAISE NOTICE 'Tables created: sessions, participants, qr_refs';
  RAISE NOTICE 'Roles created: web_anon, authenticator';
END $$;
