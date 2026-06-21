# Rushify

Rushify is a premium white-label media streaming web app that unifies IPTV (M3U/XMLTV) and a personal media library backend into one cinematic dashboard.

## Architecture

Rushify follows a layered architecture with strict server-side data isolation:

```text
Presentation   -> React App Router pages, layout shell, UI components
Application    -> Route handlers (BFF), orchestration services, React Query hooks (future)
Domain         -> Shared types and business models (channels, programmes, library items)
Infrastructure -> Jellyfin adapter, IPTV cache/parser, in-process TTL cache, stream proxy
```

### Backend-for-Frontend (BFF)

The browser never contacts Jellyfin or IPTV sources directly. All upstream access flows through Next.js Route Handlers under `src/app/api/`:

- `/api/jellyfin/[...path]` — media library proxy skeleton
- `/api/iptv/channels` — cached M3U channel snapshot
- `/api/iptv/epg` — cached XMLTV programme guide snapshot
- `/api/stream/[...path]` — playback proxy skeleton
- `/api/health` — service health probe

### Jellyfin adapter (server-only)

`src/lib/jellyfin/client.ts` wraps authenticated server-side requests using environment credentials. It is imported only from server modules (`server-only` guard on config and infrastructure layers).

### IPTV caching strategy

Large M3U/XMLTV feeds are never parsed synchronously on every request.

- `MemoryCache` provides TTL + stale-while-revalidate semantics in-process
- `IptvCacheManager` adds refresh locks to prevent concurrent refresh storms
- `IptvService` orchestrates background refresh on an interval and serves stale data while refresh runs
- `parser.ts` contains async streaming parser stubs for future chunked ingestion

For multi-replica Docker deployments, Redis can replace the in-process cache later. The current design keeps cache access behind a manager abstraction to simplify that migration.

### Client state management

- **Server state:** TanStack Query (`@tanstack/react-query`) for API-backed data
- **Client state:** minimal local UI state only; Zustand or React context can be added where cross-page UI state is needed

### Parsing strategy (planned)

1. Background refresh on interval (15 minutes default)
2. Stale-while-revalidate responses from cache
3. Incremental/streaming M3U and XMLTV parsing with progress callbacks
4. Refresh locks to deduplicate in-flight work

## Project structure

```text
src/
  app/
    (dashboard)/          # Main Rushify shell and pages
    api/                  # BFF route handlers
  components/
    layout/               # App shell, sidebar, header, logo
    ui/                   # Base UI primitives
  lib/
    cache/                # Generic TTL cache
    config/               # Zod-validated environment
    iptv/                 # IPTV cache, parser stubs, service
    jellyfin/             # Server-only media backend client
    providers/            # React Query provider
  types/                  # Shared domain types
```

## Environment variables

Copy `.env.example` to `.env.local` (development) or `.env` (Docker):

| Variable | Description |
| --- | --- |
| `JELLYFIN_SERVER_URL` | Media library backend base URL |
| `JELLYFIN_API_KEY` | Server-side API key |
| `IPTV_M3U_URL` | Remote M3U playlist URL |
| `IPTV_EPG_URL` | Remote XMLTV EPG URL |

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production (Docker / unRAID)

```bash
cp .env.example .env
docker compose up --build -d
```

The Dockerfile uses Next.js `standalone` output for a minimal runtime image suitable for Intel-based unRAID hosts.

## Guardrails

- Read-only client: no local media scanning, DB creation, or asset writes
- RAM/CPU safety: IPTV ingestion is cache-first with background refresh
- Data isolation: browser -> Rushify API -> upstream services
- White-label UI: no upstream product branding in the interface

## Next implementation phases

1. Jellyfin library endpoints (continue watching, libraries, item metadata)
2. Streaming M3U/XMLTV parsers with incremental ingestion
3. Stream proxy implementation for IPTV and transcoded library playback
4. Video player integration and watch progress UI
5. Authentication/multi-user support beyond env-based server keys
