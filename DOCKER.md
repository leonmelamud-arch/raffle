# Docker Setup & Secure Internet Exposure Guide

This guide covers running HypnoRaffle locally with Docker (PostgreSQL + PostgREST) and exposing it securely to the internet.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- A [Cloudflare](https://cloudflare.com/) account (free tier - for internet exposure)

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

### 1. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` (defaults work out of the box):
```bash
# PostgreSQL (local Docker)
POSTGRES_USER=raffle
POSTGRES_PASSWORD=raffle_secret_123
POSTGRES_DB=raffle_db

# JWT Secret for PostgREST
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional
NEXT_PUBLIC_WINNER_WEBHOOK_URL=
CLOUDFLARE_TUNNEL_TOKEN=
```

### 2. Start Everything (Development Mode)

```bash
# Start PostgreSQL, PostgREST, and Next.js dev server
docker compose --profile dev up --build

# Services:
# - App:       http://localhost:9002
# - API:       http://localhost:3001
# - Database:  localhost:5432
```

### 3. Start in Production Mode

```bash
# Start all services in production mode
docker compose --profile prod up --build -d

# Services:
# - App:       http://localhost:3000
# - API:       http://localhost:3001
# - Database:  localhost:5432
```

### Common Commands

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f postgres
docker compose logs -f postgrest
docker compose logs -f raffle-dev

# Rebuild after code changes
docker compose --profile dev up --build

# Access PostgreSQL directly
docker exec -it raffle-postgres psql -U raffle -d raffle_db

# Check database tables
docker exec -it raffle-postgres psql -U raffle -d raffle_db -c "\dt"
```

---

## Database Management

### Connect to PostgreSQL

```bash
# Using Docker
docker exec -it raffle-postgres psql -U raffle -d raffle_db

# Using external client (pgAdmin, DBeaver, etc.)
# Host: localhost
# Port: 5432
# User: raffle
# Password: raffle_secret_123
# Database: raffle_db
```

### Reset Database

```bash
# Stop containers and remove volume
docker compose down -v

# Restart (database will be recreated from init.sql)
docker compose --profile dev up --build
```

### View Data

```bash
# List all participants
docker exec -it raffle-postgres psql -U raffle -d raffle_db -c "SELECT * FROM participants;"

# List all sessions
docker exec -it raffle-postgres psql -U raffle -d raffle_db -c "SELECT * FROM sessions;"
```

---

## 🔒 Secure Internet Exposure Options

### Option 1: Cloudflare Tunnel (Recommended) ⭐

**Why it's the safest:**
- No ports opened on your router
- DDoS protection included
- Free SSL/TLS certificates
- Hides your real IP address
- Zero Trust security model

**Setup Steps:**

1. **Create a Cloudflare Account** (if you don't have one)
   - Go to https://dash.cloudflare.com/
   - Sign up for free

2. **Set Up Cloudflare Zero Trust**
   - Go to https://one.dash.cloudflare.com/
   - Navigate to **Networks** → **Tunnels**
   - Click **Create a tunnel**
   - Choose **Cloudflared** connector type
   - Name your tunnel (e.g., "hypnoraffle")
   - Copy the tunnel token

3. **Add Token to Environment**
   ```bash
   # In .env.local
   CLOUDFLARE_TUNNEL_TOKEN=your_copied_token
   ```

4. **Configure the Tunnel Route**
   - In Cloudflare dashboard, configure the public hostname
   - Set the service to: `http://raffle-prod:3000`
   - Add a subdomain (e.g., `raffle.yourdomain.com`)

5. **Start with Tunnel**
   ```bash
   docker compose --profile prod --profile tunnel up -d
   ```

6. **Access your app** at `https://raffle.yourdomain.com`

**Security Settings in Cloudflare (Optional but Recommended):**
- Enable **Bot Fight Mode**
- Set up **Access Policies** to require authentication
- Enable **WAF** rules for additional protection

---

### Option 2: Tailscale (Good for Private Access)

Best for: Sharing with a small group without exposing to public internet.

```bash
# Install Tailscale
brew install tailscale  # macOS
# or visit: https://tailscale.com/download

# Start Tailscale
tailscale up

# Share your app (only with your Tailscale network)
# Access via your machine's Tailscale IP: http://100.x.x.x:3000
```

---

### Option 3: ngrok (Quick Testing Only)

⚠️ **Not recommended for production** - Use only for quick demos.

```bash
# Install ngrok
brew install ngrok  # macOS

# Expose local port
ngrok http 3000

# You'll get a temporary URL like: https://abc123.ngrok.io
```

**Security Warning:** ngrok URLs are public and discoverable.

---

## 🛡️ Security Best Practices

### 1. Never Expose Ports Directly
❌ **DON'T** open ports on your router (port forwarding)
✅ **DO** use tunneling solutions (Cloudflare, Tailscale)

### 2. Environment Variables
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Use strong, unique passwords for PostgreSQL
- Change the default `JWT_SECRET`

### 3. Database Security
- PostgreSQL is only exposed locally (127.0.0.1:5432)
- PostgREST uses role-based access (web_anon role)
- Change default passwords in production

### 4. Rate Limiting
Consider adding rate limiting in Cloudflare:
- Go to **Security** → **WAF** → **Rate limiting rules**
- Create rules to limit requests per IP

### 5. Access Control with Cloudflare Zero Trust
For private raffles:
1. Go to **Access** → **Applications**
2. Add your tunnel hostname
3. Create a policy requiring authentication

### 6. Keep Docker Updated
```bash
# Update Docker Desktop regularly
docker system prune -af  # Clean unused images
```

---

## Troubleshooting

### PostgreSQL won't start
```bash
# Check logs
docker compose logs postgres

# Reset database
docker compose down -v
docker compose --profile dev up --build
```

### PostgREST connection refused
```bash
# Check if postgres is healthy
docker compose ps

# Wait for postgres to be ready, then restart postgrest
docker compose restart postgrest
```

### API returns 404
```bash
# Verify tables exist
docker exec -it raffle-postgres psql -U raffle -d raffle_db -c "\dt"

# Re-run init script if needed
docker compose down -v
docker compose --profile dev up --build
```

### Container won't start
```bash
# Check logs
docker compose logs raffle-prod

# Verify environment variables are set
docker compose config
```

### Cloudflare Tunnel not connecting
```bash
# Check tunnel status
docker compose logs cloudflared

# Verify token is correct in .env.local
```

### Build fails
```bash
# Clear Docker cache
docker builder prune -af

# Rebuild
docker compose --profile prod build --no-cache
```

---

## Full Architecture with Internet Exposure

```
Internet Users
       │
       ▼
┌─────────────────┐
│  Cloudflare     │  ◄── DDoS Protection, WAF, SSL
│  Edge Network   │
└────────┬────────┘
         │ (Encrypted Tunnel)
         ▼
┌─────────────────────────────────────────────────────┐
│                 Docker Compose                       │
│  ┌──────────┐                                        │
│  │cloudflared│ ◄── Tunnel connector                 │
│  └─────┬─────┘                                       │
│        │ (Internal Network)                          │
│        ▼                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │ Next.js  │───▶│PostgREST │───▶│ PostgreSQL   │   │
│  │ (App)    │    │ (API)    │    │ (Database)   │   │
│  └──────────┘    └──────────┘    └──────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Cost Summary

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Docker | ✅ Free | Docker Desktop is free for personal use |
| PostgreSQL | ✅ Free | Local Docker container |
| PostgREST | ✅ Free | Local Docker container |
| Cloudflare | ✅ Free | Unlimited tunnels, basic protection |
| Tailscale | ✅ Free | Up to 100 devices |

**Total: $0/month** for personal/small-scale use!
