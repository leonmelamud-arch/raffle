
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
│  │  :3000/9002 │    │  :3001      │    │   :5432         │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Set Up Environment
```bash
cp .env.example .env.local
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
| `docker/init.sql` | Database initialization script |
| `Dockerfile` | Production build |
| `Dockerfile.dev` | Development with hot-reload |
| `.dockerignore` | Excludes files from Docker build |
| `DOCKER.md` | Complete Docker documentation |

## Database Tables

- **sessions**: Raffle session management
- **participants**: Raffle participants with `won` status
- **qr_refs**: QR code reference links

## Secure Internet Exposure

Use **Cloudflare Tunnel** (free) for secure public access:

1. Create tunnel at https://one.dash.cloudflare.com/
2. Add `CLOUDFLARE_TUNNEL_TOKEN` to `.env.local`
3. Run: `docker compose --profile prod --profile tunnel up -d`

See `DOCKER.md` for complete documentation.
