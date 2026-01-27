# AGENTS.md - AI Agent Guidelines for HypnoRaffle

This document provides guidance for AI agents working on the HypnoRaffle codebase.

## Project Overview

**HypnoRaffle** is a real-time raffle application with hypnotic visual effects. Users can join via QR code, and winners are selected through an engaging slot machine animation.

### Tech Stack

- **Framework**: Next.js 15 with App Router (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PostgreSQL with PostgREST API (Docker-based)
- **AI Integration**: Google Genkit (optional)
- **Deployment**: Docker with Cloudflare Tunnel (self-hosted)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main raffle host view
│   ├── qr/page.tsx        # Participant join page (QR scan destination)
│   └── qr-display/page.tsx # Dedicated QR code display screen
├── components/
│   ├── layout/            # Layout components (Header)
│   ├── raffle/            # Raffle-specific components
│   │   ├── Confetti.tsx   # Celebration effects
│   │   ├── ParticipantImporter.tsx
│   │   ├── ParticipantsList.tsx
│   │   ├── SessionIndicator.tsx
│   │   └── SlotMachine.tsx # Main raffle animation
│   └── ui/                # shadcn/ui components (DO NOT MODIFY)
├── context/               # React Context providers
│   ├── ParticipantsContext.tsx
│   ├── QrModalContext.tsx
│   └── SessionContext.tsx
├── hooks/                 # Custom React hooks
│   ├── use-participants.ts # Participants polling hook
│   ├── use-session.ts     # Session management
│   └── use-toast.ts       # Toast notifications
├── lib/                   # Utilities and configurations
│   ├── postgrest.ts       # PostgREST client
│   ├── supabase.ts        # Database client (wraps PostgREST)
│   └── utils.ts           # Helper functions (secureRandom, cn, etc.)
├── types/                 # TypeScript type definitions
│   └── index.ts           # Participant, Session interfaces
└── ai/                    # Genkit AI configuration (optional feature)
```

## Key Concepts

### Sessions

- Each raffle instance has a unique `session_id` (UUID)
- Sessions isolate participants between different raffle events
- Session ID is displayed in the UI and stored in the browser

### Participants

```typescript
interface Participant {
  id: string;
  name: string;
  last_name: string;
  display_name: string;
  session_id?: string;
  email?: string;
  won?: boolean;  // Tracks if participant has won
}
```

### Polling for Updates

Since PostgREST doesn't support real-time subscriptions, use polling:

```typescript
useEffect(() => {
  const fetchData = async () => {
    const { data } = await db.from('participants').select('*').eq('session_id', sessionId);
    setParticipants(data || []);
  };
  
  fetchData();
  const interval = setInterval(fetchData, 2000); // Poll every 2 seconds
  return () => clearInterval(interval);
}, [sessionId]);
```

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use `"use client"` directive for client-side components
- Follow existing patterns in the codebase

### Component Guidelines

1. **UI Components** (`src/components/ui/`): These are shadcn/ui components. Do not modify directly. To add new components, use the shadcn CLI.

2. **Raffle Components** (`src/components/raffle/`): Core business logic components. These can be modified.

3. **Context Providers**: Wrap the app in providers defined in `src/context/`. Access state via custom hooks.

### Database Operations

- Always use the database client from `@/lib/supabase` (wraps PostgREST)
- Include `session_id` when inserting participants
- Row Level Security (RLS) is enabled in PostgreSQL - respect policies
- API calls go through PostgREST at port 3001

### Environment Variables

Required environment variables:
```
# Database
POSTGRES_USER=hypnoraffle
POSTGRES_PASSWORD=<secure_password>
POSTGRES_DB=hypnoraffle

# API
NEXT_PUBLIC_POSTGREST_URL=http://localhost:3001
JWT_SECRET=<min_32_char_secret>

# App
NEXT_PUBLIC_APP_URL=http://localhost:9002
NEXT_PUBLIC_WINNER_WEBHOOK_URL=<optional_webhook_url>

# Optional: Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=<tunnel_token>
```

## Common Tasks

### Adding a New Page

1. Create a new directory under `src/app/`
2. Add a `page.tsx` file with the page component
3. Use `"use client"` if the page needs client-side features

### Adding a New Component

1. Create the component in the appropriate directory
2. Use TypeScript interfaces for props
3. Import UI components from `@/components/ui/`

### Modifying Database Schema

1. Update SQL in `docker/init.sql`
2. Rebuild containers: `docker compose down && docker compose --profile dev up --build`
3. Update TypeScript types in `src/types/index.ts`

### Working with Participants

```typescript
// Fetch participants
import { db } from '@/lib/supabase';

const { data, error } = await db
  .from('participants')
  .select('*')
  .eq('session_id', sessionId);

// Insert participant
await db.from('participants').insert({
  name: 'John',
  last_name: 'Doe',
  display_name: 'John D.',
  session_id: sessionId,
  email: 'john@example.com'
});

// Mark winner
await db
  .from('participants')
  .update({ won: true })
  .eq('id', participantId);

// Create session with QR code (RPC call)
const { data } = await db.rpc('create_session_with_qr', { 
  session_name: 'My Raffle' 
});
```

## Testing & Validation

- Run `npm run typecheck` to verify TypeScript types
- Run `npm run lint` for linting
- Run `npm run build` to ensure build works

## Docker Commands

```bash
# Development (with hot-reload)
docker compose --profile dev up --build

# Production
docker compose --profile prod up -d --build

# With Cloudflare Tunnel
docker compose --profile prod --profile tunnel up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Reset database (DELETES DATA)
docker compose down -v
```

## Important Notes

1. **Docker Deployment**: The app runs in Docker with PostgreSQL + PostgREST. Use `docker compose --profile dev up` for development.

2. **Secure Random**: Use `secureRandom()` from `@/lib/utils` for winner selection, not `Math.random()`.

3. **Toast Notifications**: Use the `useToast()` hook for user feedback.

4. **Polling for Updates**: Since PostgREST doesn't support real-time, use polling or implement SSE for live updates.

5. **Session Isolation**: Always filter data by `session_id` to prevent cross-session data leaks.

6. **Security**: RLS policies are in `docker/init.sql`. JWT authentication is available for admin features.

## File Naming Conventions

- Components: PascalCase (`SlotMachine.tsx`)
- Hooks: kebab-case with `use-` prefix (`use-participants.ts`)
- Utilities: kebab-case (`utils.ts`)
- Types: PascalCase for interfaces, camelCase for type aliases
