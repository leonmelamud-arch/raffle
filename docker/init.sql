-- ============================================
-- HypnoRaffle Database Initialization
-- Secure PostgreSQL + PostgREST Setup
-- ============================================

-- Create API schema (keeps things organized)
CREATE SCHEMA IF NOT EXISTS api;

-- ============================================
-- ROLES
-- ============================================

-- Anonymous role (unauthenticated users)
CREATE ROLE web_anon NOLOGIN;

-- Authenticated role (for future admin features)
CREATE ROLE authenticated NOLOGIN;

-- Authenticator role (PostgREST connects as this)
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgrest_password';
GRANT web_anon TO authenticator;
GRANT authenticated TO authenticator;

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

-- Sessions table
CREATE TABLE api.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Participants table
CREATE TABLE api.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES api.sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    last_name TEXT,
    display_name TEXT NOT NULL,
    email TEXT,
    won BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR References table
CREATE TABLE api.qr_refs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES api.sessions(id) ON DELETE CASCADE,
    short_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_participants_session ON api.participants(session_id);
CREATE INDEX idx_participants_won ON api.participants(session_id, won);
CREATE INDEX idx_qr_refs_short_code ON api.qr_refs(short_code);
CREATE INDEX idx_qr_refs_session ON api.qr_refs(session_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE api.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.qr_refs ENABLE ROW LEVEL SECURITY;

-- Sessions policies
-- Anyone can read active sessions (needed for participants to join)
CREATE POLICY "Sessions are viewable by everyone" 
    ON api.sessions FOR SELECT 
    TO web_anon, authenticated
    USING (is_active = true);

-- Only authenticated users can create/modify sessions
CREATE POLICY "Sessions are insertable by authenticated" 
    ON api.sessions FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Sessions are updatable by authenticated" 
    ON api.sessions FOR UPDATE 
    TO authenticated
    USING (true);

-- For development: allow anonymous session creation
CREATE POLICY "Sessions insertable by anon (dev)" 
    ON api.sessions FOR INSERT 
    TO web_anon
    WITH CHECK (true);

-- Participants policies
-- Anyone can view participants in a session they have access to
CREATE POLICY "Participants are viewable by everyone" 
    ON api.participants FOR SELECT 
    TO web_anon, authenticated
    USING (true);

-- Anyone can add themselves as participant (via QR code)
CREATE POLICY "Participants can be inserted by anyone" 
    ON api.participants FOR INSERT 
    TO web_anon, authenticated
    WITH CHECK (
        -- Can only insert with won = false
        won = false
    );

-- Only authenticated users can update participants (mark winners)
CREATE POLICY "Participants updatable by authenticated" 
    ON api.participants FOR UPDATE 
    TO authenticated
    USING (true);

-- For development: allow anonymous updates
CREATE POLICY "Participants updatable by anon (dev)" 
    ON api.participants FOR UPDATE 
    TO web_anon
    USING (true);

-- Only authenticated users can delete participants
CREATE POLICY "Participants deletable by authenticated" 
    ON api.participants FOR DELETE 
    TO authenticated
    USING (true);

-- For development: allow anonymous deletes
CREATE POLICY "Participants deletable by anon (dev)" 
    ON api.participants FOR DELETE 
    TO web_anon
    USING (true);

-- QR refs policies
CREATE POLICY "QR refs are viewable by everyone" 
    ON api.qr_refs FOR SELECT 
    TO web_anon, authenticated
    USING (true);

CREATE POLICY "QR refs insertable by authenticated" 
    ON api.qr_refs FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- For development: allow anonymous QR ref creation
CREATE POLICY "QR refs insertable by anon (dev)" 
    ON api.qr_refs FOR INSERT 
    TO web_anon
    WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA api TO web_anon, authenticated;

-- Grant table permissions to web_anon (anonymous users)
GRANT SELECT ON api.sessions TO web_anon;
GRANT INSERT ON api.sessions TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.participants TO web_anon;
GRANT SELECT, INSERT ON api.qr_refs TO web_anon;

-- Grant full permissions to authenticated users
GRANT ALL ON api.sessions TO authenticated;
GRANT ALL ON api.participants TO authenticated;
GRANT ALL ON api.qr_refs TO authenticated;

-- Grant sequence usage (for auto-generated IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA api TO web_anon, authenticated;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate short codes for QR refs
CREATE OR REPLACE FUNCTION api.generate_short_code(length INTEGER DEFAULT 6)
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
CREATE OR REPLACE FUNCTION api.create_session_with_qr(session_name TEXT DEFAULT NULL)
RETURNS TABLE(session_id UUID, short_code TEXT) AS $$
DECLARE
    new_session_id UUID;
    new_short_code TEXT;
BEGIN
    -- Create session
    INSERT INTO api.sessions (name) VALUES (session_name) RETURNING id INTO new_session_id;
    
    -- Generate unique short code
    LOOP
        new_short_code := api.generate_short_code(6);
        BEGIN
            INSERT INTO api.qr_refs (session_id, short_code) VALUES (new_session_id, new_short_code);
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            -- Try again with a new code
        END;
    END LOOP;
    
    RETURN QUERY SELECT new_session_id, new_short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION api.generate_short_code TO web_anon, authenticated;
GRANT EXECUTE ON FUNCTION api.create_session_with_qr TO web_anon, authenticated;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION api.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
    BEFORE UPDATE ON api.sessions
    FOR EACH ROW EXECUTE FUNCTION api.update_updated_at();

CREATE TRIGGER participants_updated_at
    BEFORE UPDATE ON api.participants
    FOR EACH ROW EXECUTE FUNCTION api.update_updated_at();

-- ============================================
-- RATE LIMITING (Basic)
-- ============================================

-- Track API requests for rate limiting
CREATE TABLE api.rate_limits (
    ip_address INET NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ip_address, endpoint)
);

-- Cleanup old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION api.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM api.rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

GRANT SELECT, INSERT, UPDATE ON api.rate_limits TO web_anon, authenticated;
