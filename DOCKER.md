# Docker Deployment Guide - HypnoRaffle

This guide covers running HypnoRaffle with Docker using PostgreSQL + PostgREST.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Compose                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │   Next.js    │───▶│  PostgREST   │───▶│     PostgreSQL        │  │
│  │    (App)     │    │    (API)     │    │     (Database)        │  │
│  │  Port: 9002  │    │  Port: 3001  │    │     Port: 5432        │  │
│  └──────────────┘    └──────────────┘    └───────────────────────┘  │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────┐                                                    │
│  │  Cloudflare  │  (Optional - for internet access)                 │
│  │   Tunnel     │                                                    │
│  └──────────────┘                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Clone and Setup

```bash
cd raffle-qr
cp .env.example .env.local
```

### 2. Configure Environment

Edit `.env.local` with secure passwords:

```bash
# Generate secure passwords
openssl rand -base64 24  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For JWT_SECRET
```

### 3. Start Development

```bash
docker compose --profile dev up --build
```

### 4. Access the App

- **Application**: http://localhost:9002
- **API (PostgREST)**: http://localhost:3001
- **Database**: localhost:5432

## Profiles

| Profile | Command | Use Case |
|---------|---------|----------|
| `dev` | `docker compose --profile dev up` | Development with hot-reload |
| `prod` | `docker compose --profile prod up -d` | Production build |
| `tunnel` | `docker compose --profile prod --profile tunnel up -d` | Production with internet access |

## Services

### PostgreSQL (hypnoraffle-db)

- **Image**: postgres:16-alpine
- **Port**: 5432
- **Data**: Persisted in `postgres_data` volume
- **Init Script**: `docker/init.sql`

Connect directly:
```bash
docker exec -it hypnoraffle-db psql -U hypnoraffle -d hypnoraffle
```

### PostgREST (hypnoraffle-api)

- **Image**: postgrest/postgrest:v12.0.2
- **Port**: 3001
- **Schema**: `api`
- **Anonymous Role**: `web_anon`

Test the API:
```bash
# Get all sessions
curl http://localhost:3001/sessions

# Get participants for a session
curl "http://localhost:3001/participants?session_id=eq.<uuid>"

# Create a participant
curl -X POST http://localhost:3001/participants \
  -H "Content-Type: application/json" \
  -d '{"name":"John","last_name":"Doe","display_name":"John D.","session_id":"<uuid>"}'
```

### Next.js App

- **Dev Port**: 9002 (with hot-reload)
- **Prod Port**: 9002 (standalone build)

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `api.sessions` | Raffle sessions |
| `api.participants` | Participants with `won` status |
| `api.qr_refs` | QR code short links |
| `api.rate_limits` | API rate limiting |

### Row Level Security (RLS)

All tables have RLS enabled:

- **Anonymous users** (`web_anon`):
  - Can SELECT active sessions
  - Can INSERT participants (with `won=false`)
  - Can SELECT participants
  - Limited UPDATE/DELETE (dev mode only)

- **Authenticated users** (`authenticated`):
  - Full CRUD on all tables
  - Required for admin operations

## Security

### JWT Authentication

For admin operations, generate a JWT:

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "role": "authenticated",
  "exp": 1735689600  // Expiration timestamp
}
```

Sign with your `JWT_SECRET` and use:
```bash
curl http://localhost:3001/participants \
  -H "Authorization: Bearer <your-jwt-token>" \
  -X PATCH \
  -d '{"won": true}'
```

### Production Hardening

1. **Remove dev policies** from `docker/init.sql`:
   - Delete policies ending with `(dev)`
   
2. **Set secure passwords** in `.env.local`

3. **Use Cloudflare Tunnel** instead of exposing ports

4. **Enable HTTPS** via Cloudflare

## Cloudflare Tunnel Setup

### 1. Create Tunnel

1. Go to https://one.dash.cloudflare.com/
2. Navigate to **Networks** → **Tunnels**
3. Click **Create a tunnel**
4. Name it `hypnoraffle`
5. Copy the tunnel token

### 2. Configure Tunnel

In Cloudflare dashboard, add a public hostname:
- **Subdomain**: `raffle` (or your choice)
- **Domain**: Your Cloudflare domain
- **Service**: `http://app-prod:3000`

### 3. Add Token to Environment

```bash
# .env.local
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here
```

### 4. Start with Tunnel

```bash
docker compose --profile prod --profile tunnel up -d
```

Your app is now available at `https://raffle.yourdomain.com`

## Common Commands

```bash
# Start development
docker compose --profile dev up --build

# Start production
docker compose --profile prod up -d --build

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f postgrest

# Stop all services
docker compose down

# Stop and remove volumes (DELETES DATA)
docker compose down -v

# Rebuild without cache
docker compose build --no-cache

# Execute SQL
docker exec -it hypnoraffle-db psql -U hypnoraffle -d hypnoraffle -c "SELECT * FROM api.participants;"

# Backup database
docker exec hypnoraffle-db pg_dump -U hypnoraffle hypnoraffle > backup.sql

# Restore database
cat backup.sql | docker exec -i hypnoraffle-db psql -U hypnoraffle -d hypnoraffle
```

## Troubleshooting

### PostgREST won't start

Check PostgreSQL is healthy:
```bash
docker compose logs postgres
```

Verify init.sql ran correctly:
```bash
docker exec -it hypnoraffle-db psql -U hypnoraffle -d hypnoraffle -c "\dt api.*"
```

### CORS errors

Add your domain to `CORS_ORIGINS` in `.env.local`:
```bash
CORS_ORIGINS=http://localhost:9002,https://raffle.yourdomain.com
```

### Connection refused to API

Ensure PostgREST is using the correct internal URL:
- From browser: `http://localhost:3001`
- From app container: `http://postgrest:3000`

### Database data lost

Data is stored in Docker volume. If you ran `docker compose down -v`, the volume was deleted. Use regular `docker compose down` to preserve data.

## Migrating from Supabase

The PostgREST client (`src/lib/postgrest.ts`) mirrors the Supabase API:

```typescript
// Before (Supabase)
import { supabase } from '@/lib/supabase';
const { data } = await supabase.from('participants').select('*');

// After (PostgREST) - Same API!
import { db } from '@/lib/supabase';
const { data } = await db.from('participants').select('*');
```

The main difference: no real-time subscriptions. Use polling instead:

```typescript
// Poll every 2 seconds
useEffect(() => {
  const interval = setInterval(fetchParticipants, 2000);
  return () => clearInterval(interval);
}, []);
```
