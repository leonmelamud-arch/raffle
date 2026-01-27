# Implementation Plan - Docker Local Development

This plan outlines the Docker-based local development setup with PostgreSQL + PostgREST.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  Next.js    │───▶│  PostgREST  │───▶│   PostgreSQL    │  │
│  │  (App)      │    │  (API)      │    │   (Database)    │  │
│  │  :9002      │    │  :3001      │    │   :5432         │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                            │
│  │ Cloudflare  │  (Optional - secure internet access)      │
│  │   Tunnel    │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Set Up Environment
```bash
cp .env.example .env.local
# Edit .env.local with secure passwords
```

### 2. Start Development
```bash
docker compose --profile dev up --build
```

### 3. Access Services
- **App**: http://localhost:9002
- **API**: http://localhost:3001
- **Database**: localhost:5432

## Files Structure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates PostgreSQL, PostgREST, and App |
| `docker/init.sql` | Database initialization with RLS policies |
| `Dockerfile` | Production multi-stage build |
| `Dockerfile.dev` | Development with hot-reload |
| `.dockerignore` | Excludes files from Docker build |
| `.env.example` | Environment variable template |
| `DOCKER.md` | Complete Docker documentation |
| `AGENTS.md` | AI agent development guidelines |

## Database Tables

| Table | Purpose |
|-------|---------|
| `api.sessions` | Raffle session management |
| `api.participants` | Raffle participants with `won` status |
| `api.qr_refs` | QR code short links |
| `api.rate_limits` | Request rate limiting |

## Security Features

- **Row Level Security (RLS)**: All tables protected
- **Roles**: `web_anon` (public), `authenticated` (admin)
- **JWT Authentication**: Ready for admin features
- **Session Isolation**: Data filtered by `session_id`
- **Secure Random**: Winner selection uses `crypto.getRandomValues()`

## API Client

The app uses a PostgREST client (`src/lib/postgrest.ts`) that mirrors Supabase API:

```typescript
import { db } from '@/lib/supabase';

// Same API as Supabase!
const { data } = await db.from('participants').select('*').eq('session_id', id);
```

## Polling for Real-time

Since PostgREST doesn't support subscriptions, use polling:

```typescript
useEffect(() => {
  const interval = setInterval(fetchData, 2000);
  return () => clearInterval(interval);
}, []);
```

## Production Deployment

### Option 1: Local Network Only
```bash
docker compose --profile prod up -d --build
```

### Option 2: Internet Access via Cloudflare Tunnel
1. Create tunnel at https://one.dash.cloudflare.com/
2. Add `CLOUDFLARE_TUNNEL_TOKEN` to `.env.local`
3. Run:
```bash
docker compose --profile prod --profile tunnel up -d
```

## Commands Reference

```bash
# Development
docker compose --profile dev up --build

# Production
docker compose --profile prod up -d --build

# With tunnel
docker compose --profile prod --profile tunnel up -d

# Logs
docker compose logs -f

# Stop
docker compose down

# Reset DB (DELETES DATA)
docker compose down -v

# Database shell
docker exec -it hypnoraffle-db psql -U hypnoraffle -d hypnoraffle
```

See `DOCKER.md` for complete documentation.
