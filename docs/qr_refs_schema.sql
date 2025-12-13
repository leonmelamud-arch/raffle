-- =====================================================
-- QR References Table Schema for Supabase
-- =====================================================
-- This table stores personal QR codes that redirect to user-defined URLs
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- =====================================================

-- Drop existing tables if you want a fresh start (CAUTION: deletes all data!)
-- DROP TABLE IF EXISTS qr_scans CASCADE;
-- DROP TABLE IF EXISTS qr_refs CASCADE;

-- =====================================================
-- STEP 1: Create the QR refs table
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_refs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields (required)
    name VARCHAR(100) NOT NULL,                    -- Display name for the QR code (e.g., "My LinkedIn")
    slug VARCHAR(50) UNIQUE NOT NULL,              -- URL identifier, must be unique (e.g., "linkedin")
    target_url TEXT NOT NULL,                      -- The destination URL when QR is scanned
    
    -- Metadata (optional)
    description TEXT,                              -- Optional description/notes
    category VARCHAR(50) DEFAULT 'personal',       -- Category: social, work, personal, portfolio, other
    
    -- Analytics (cached for performance - also stored in qr_scans for details)
    scan_count INTEGER DEFAULT 0,                  -- Number of times scanned
    last_scanned_at TIMESTAMPTZ,                   -- When it was last scanned
    
    -- Status & TTL
    is_active BOOLEAN DEFAULT true,                -- Enable/disable the QR code
    expires_at TIMESTAMPTZ,                        -- Optional expiration (NULL = never expires)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),          -- When created
    updated_at TIMESTAMPTZ DEFAULT NOW()           -- When last modified
);

-- =====================================================
-- STEP 2: Create the scans table (analytics)
-- =====================================================
-- This tracks every scan with device info, location, etc.
-- scan_count and last_scanned_at are derived from this table

CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to QR code
    qr_ref_id UUID NOT NULL REFERENCES qr_refs(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,                     -- Stored for convenience
    
    -- Device & Browser info
    user_agent TEXT,                               -- Full user agent string
    device_type VARCHAR(20),                       -- mobile, tablet, desktop
    os VARCHAR(50),                                -- iOS, Android, Windows, macOS, etc.
    browser VARCHAR(50),                           -- Chrome, Safari, Firefox, etc.
    
    -- Location info (from IP geolocation)
    ip_address VARCHAR(45),                        -- IPv4 or IPv6
    country VARCHAR(100),                          -- Country name
    country_code VARCHAR(2),                       -- ISO country code (US, IL, etc.)
    city VARCHAR(100),                             -- City name
    region VARCHAR(100),                           -- State/Province
    
    -- Additional context
    referrer TEXT,                                 -- Where they came from (usually empty for QR)
    language VARCHAR(10),                          -- Browser language preference
    
    -- Timestamp
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: Create indexes for better performance
-- =====================================================

-- Fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_qr_refs_slug ON qr_refs(slug);

-- Fast lookup scans by QR code
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_ref_id ON qr_scans(qr_ref_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_slug ON qr_scans(slug);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);

-- =====================================================
-- STEP 4: Auto-update the updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_qr_refs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_refs_updated_at ON qr_refs;
CREATE TRIGGER trigger_qr_refs_updated_at
    BEFORE UPDATE ON qr_refs
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_refs_updated_at();

-- =====================================================
-- STEP 5: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE qr_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- QR Refs policies
DROP POLICY IF EXISTS "Public can view QR refs" ON qr_refs;
CREATE POLICY "Public can view QR refs" ON qr_refs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert QR refs" ON qr_refs;
CREATE POLICY "Public can insert QR refs" ON qr_refs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update QR refs" ON qr_refs;
CREATE POLICY "Public can update QR refs" ON qr_refs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete QR refs" ON qr_refs;
CREATE POLICY "Public can delete QR refs" ON qr_refs FOR DELETE USING (true);

-- QR Scans policies
DROP POLICY IF EXISTS "Public can view scans" ON qr_scans;
CREATE POLICY "Public can view scans" ON qr_scans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert scans" ON qr_scans;
CREATE POLICY "Public can insert scans" ON qr_scans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete scans" ON qr_scans;
CREATE POLICY "Public can delete scans" ON qr_scans FOR DELETE USING (true);

-- =====================================================
-- DONE! Tables are ready to use.
-- =====================================================
-- 
-- Design notes:
-- - qr_refs.scan_count and last_scanned_at are cached for fast display
-- - qr_scans stores detailed analytics (device, location, etc.)
-- - Both are updated on each scan for best of both worlds
-- =====================================================
