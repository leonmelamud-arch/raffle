# PostgREST Setup Guide

This guide explains how to set up PostgREST with your local PostgreSQL database and expose it via Cloudflare Tunnel at `api.robot-new.com`.

## Architecture Overview

```
[Browser at qr.ai-know.org (GitHub Pages)]
        ↓ (HTTP/REST calls)
[Cloudflare Tunnel: api.robot-new.com]
        ↓
[PostgREST container (Docker)]
        ↓
[wa_llm-postgres-1 (PostgreSQL at 172.20.0.3)]
```

## Prerequisites

- Docker and Docker Compose installed
- Access to your PostgreSQL database (`wa_llm-postgres-1`)
- Cloudflare account with `robot-new.com` domain
- `cloudflared` container already running

---

## Step 1: Create the Database

Connect to your PostgreSQL instance and create the `hypnoraffle` database:

```bash
# Connect to PostgreSQL container
docker exec -it wa_llm-postgres-1 psql -U postgres
```

Then run:

```sql
-- Create database
CREATE DATABASE hypnoraffle;

-- Connect to it
\c hypnoraffle

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Step 2: Create Database Schema

Run the following SQL in the `hypnoraffle` database:

```sql
-- ==========================================
-- Sessions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ==========================================
-- Participants Table
-- ==========================================
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

CREATE INDEX IF NOT EXISTS idx_participants_session_id ON public.participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_won ON public.participants(won);

-- Unique email per session (excluding NULL emails)
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_unique_email_per_session 
  ON public.participants(email, session_id) WHERE email IS NOT NULL;

-- ==========================================
-- People Table (Admin-managed contacts)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  full_name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT
);

-- ==========================================
-- QR Refs Table (QR Code management)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.qr_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'personal',
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_qr_refs_updated_at ON public.qr_refs;
CREATE TRIGGER update_qr_refs_updated_at
    BEFORE UPDATE ON public.qr_refs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- QR Scans Table (Analytics)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_ref_id UUID NOT NULL REFERENCES public.qr_refs(id) ON DELETE CASCADE,
  slug VARCHAR(50) NOT NULL,
  user_agent TEXT,
  device_type VARCHAR(20),
  os VARCHAR(50),
  browser VARCHAR(50),
  ip_address VARCHAR(45),
  country VARCHAR(100),
  country_code VARCHAR(2),
  city VARCHAR(100),
  region VARCHAR(100),
  referrer TEXT,
  language VARCHAR(10),
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Create a role for PostgREST
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_anon') THEN
        CREATE ROLE web_anon NOLOGIN;
    END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_anon;

-- For future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO web_anon;

-- Create authenticator role for PostgREST
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'your_secure_password_here';
    END IF;
END
$$;

GRANT web_anon TO authenticator;
```

**Important:** Replace `your_secure_password_here` with a strong password!

---

## Step 3: Create PostgREST Docker Container

Create a `docker-compose.postgrest.yml` file in your Docker setup directory:

```yaml
version: '3.8'

services:
  postgrest:
    image: postgrest/postgrest:latest
    container_name: postgrest-hypnoraffle
    ports:
      - "3000:3000"
    environment:
      PGRST_DB_URI: postgres://authenticator:your_secure_password_here@172.20.0.3:5432/hypnoraffle
      PGRST_DB_SCHEMA: public
      PGRST_DB_ANON_ROLE: web_anon
      PGRST_OPENAPI_SERVER_PROXY_URI: https://api.robot-new.com
      # CORS settings - allow requests from GitHub Pages
      PGRST_SERVER_CORS_ALLOWED_ORIGINS: "https://qr.ai-know.org,http://localhost:9002,http://localhost:3000"
    networks:
      - wa_llm_default  # Use the same network as your PostgreSQL

networks:
  wa_llm_default:
    external: true
```

**Notes:**
- Replace `your_secure_password_here` with the password you set in Step 2
- The network name `wa_llm_default` should match your PostgreSQL container's network
- Check your network with: `docker network ls`

Start the container:

```bash
docker-compose -f docker-compose.postgrest.yml up -d
```

Verify it's running:

```bash
# Should return an OpenAPI spec
curl http://localhost:3000/
```

---

## Step 4: Configure Cloudflare Tunnel

### 4.1 Find your cloudflared config

The config is typically at one of these locations:
- `/etc/cloudflared/config.yml`
- `~/.cloudflared/config.yml`
- In a Docker volume

If using Docker, check:
```bash
docker inspect cloudflared | grep -A 10 Mounts
```

### 4.2 Add the new hostname

Edit your `config.yml` to add the PostgREST route:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /path/to/credentials.json

ingress:
  # Existing services...
  
  # NEW: PostgREST API for HypnoRaffle
  - hostname: api.robot-new.com
    service: http://postgrest-hypnoraffle:3000
    # Or use host IP if not on same network:
    # service: http://host.docker.internal:3000
  
  # Catch-all (must be last)
  - service: http_status:404
```

### 4.3 Add DNS record in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select **robot-new.com** domain
3. Go to **DNS** → **Records**
4. Add a new record:
   - **Type:** CNAME
   - **Name:** api
   - **Target:** `<your-tunnel-id>.cfargotunnel.com`
   - **Proxy status:** Proxied (orange cloud)

### 4.4 Restart cloudflared

```bash
docker restart cloudflared
# Or if using systemd:
sudo systemctl restart cloudflared
```

### 4.5 Verify the tunnel

```bash
# Should return the PostgREST OpenAPI spec
curl https://api.robot-new.com/

# Test a query
curl https://api.robot-new.com/sessions
```

---

## Step 5: Update GitHub Pages Environment

For the GitHub Pages deployment, you need to set the environment variable during build.

### Option A: GitHub Actions (Recommended)

Edit your `.github/workflows/deploy.yml` (or create one):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          NEXT_PUBLIC_API_URL: https://api.robot-new.com
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

### Option B: Local Build

Create a `.env.local` file (not committed to git):

```env
NEXT_PUBLIC_API_URL=https://api.robot-new.com
```

Then build and deploy:

```bash
npm run build
# Deploy the 'out' folder to GitHub Pages
```

---

## Step 6: Test Everything

### Test PostgREST directly:

```bash
# Get all sessions
curl https://api.robot-new.com/sessions

# Create a session
curl -X POST https://api.robot-new.com/sessions \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"is_active": true}'

# Get participants for a session
curl "https://api.robot-new.com/participants?session_id=eq.<session-uuid>"
```

### Test from the frontend:

1. Open https://qr.ai-know.org/raffle
2. Open browser DevTools → Network tab
3. Create a new session - should see requests to `api.robot-new.com`
4. Import participants - should save to the database

---

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Check PostgREST logs: `docker logs postgrest-hypnoraffle`
2. Verify `PGRST_SERVER_CORS_ALLOWED_ORIGINS` includes your frontend domain
3. Alternatively, configure CORS at the Cloudflare level

### Connection Refused

1. Check if PostgREST is running: `docker ps | grep postgrest`
2. Check logs: `docker logs postgrest-hypnoraffle`
3. Verify network connectivity between containers
4. Ensure PostgreSQL allows connections from the PostgREST container

### 404 on Cloudflare Tunnel

1. Check tunnel status: `docker logs cloudflared`
2. Verify the hostname is in the config
3. Check DNS propagation: `dig api.robot-new.com`
4. Restart cloudflared after config changes

### Database Permission Denied

1. Verify roles are created correctly
2. Check grants: 
   ```sql
   \c hypnoraffle
   \dp  -- Shows table permissions
   ```
3. Re-run the GRANT statements from Step 2

---

## Security Considerations

⚠️ **Important:** This setup has NO authentication. Anyone can read/write to your database via the API.

For production use, consider:

1. **API Key Authentication** - Add a secret header check
2. **Row Level Security (RLS)** - PostgreSQL native security
3. **Rate Limiting** - Configure at Cloudflare
4. **IP Allowlisting** - Restrict access in Cloudflare

---

## Quick Reference

| Component | URL/Address |
|-----------|-------------|
| Frontend | https://qr.ai-know.org |
| API | https://api.robot-new.com |
| PostgREST (local) | http://localhost:3000 |
| PostgreSQL | 172.20.0.3:5432 |
| Database | hypnoraffle |
| DB User | authenticator |
| Anonymous Role | web_anon |

---

## Maintenance

### View PostgREST logs
```bash
docker logs -f postgrest-hypnoraffle
```

### Restart PostgREST
```bash
docker restart postgrest-hypnoraffle
```

### Update PostgREST
```bash
docker-compose -f docker-compose.postgrest.yml pull
docker-compose -f docker-compose.postgrest.yml up -d
```

### Backup Database
```bash
docker exec wa_llm-postgres-1 pg_dump -U postgres hypnoraffle > backup.sql
```
