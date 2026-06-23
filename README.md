# Rushify

Rushify is a premium private media app that unifies IPTV (Xtream Codes / M3U) and a personal media library backend into one cinematic dashboard.

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

- `/api/jellyfin/[...path]` â€” media library proxy skeleton
- `/api/jellyfin/discover` â€” read-only network scan for a media server on port 8096 (no secrets exposed)
- `/api/jellyfin/status` â€” server-side media library connectivity check (no secrets exposed)
- `/api/iptv/channels` â€” cached M3U channel snapshot
- `/api/iptv/epg` â€” cached XMLTV programme guide snapshot
- `/api/iptv/status` â€” IPTV configuration and cache status
- `/api/stream/[...path]` â€” playback proxy skeleton
- `/api/health` â€” service health probe

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
| `JELLYFIN_SERVER_URL` | Media library backend base URL (default port **8096**). Optional at startup if auto-discovery finds your server â€” persisting in `.env` is recommended |
| `JELLYFIN_API_KEY` | Server-side API key from **Dashboard â†’ Advanced â†’ API Keys** |
| `JELLYFIN_DISCOVERY_URLS` | Optional comma-separated extra URLs to probe during auto-discovery |
| `IPTV_XTREAM_URL` | Xtream Codes portal base URL, e.g. `http://provider:port` |
| `IPTV_XTREAM_USERNAME` | Xtream username |
| `IPTV_XTREAM_PASSWORD` | Xtream password (server-side only) |
| `IPTV_M3U_URL` | Raw M3U playlist URL fallback (optional) |
| `IPTV_EPG_URL` | Remote XMLTV EPG URL (optional) |
| `NEXT_PUBLIC_APP_URL` | Public base URL for Chromecast stream links (e.g. `http://192.168.0.19:8096`) |
| `NEXT_PUBLIC_GOOGLE_CAST_APP_ID` | Google Cast receiver app ID (default: `CC1AD845` Default Media Receiver) |

### Google Cast (Chromecast)

Rushify supports casting Live TV and VOD to Chromecast via the **Google Cast Web Sender SDK** and the Default Media Receiver.

- **Live TV:** HLS streams are proxied through short-lived cast tokens (`/api/stream/cast/{token}`) so Chromecast devices do not need session cookies.
- **VOD:** Jellyfin HLS (`master.m3u8`) is proxied the same way when you cast from `/watch/[id]`.
- **Cast button:** Appears in Live TV players and the VOD watch page when Cast devices are detected on your network.
- **Browser support:** Works in **Chrome on desktop and Android**. Safari, Firefox, and most mobile browsers do not expose the Cast sender API â€” use Chrome on Android or desktop to cast.

Set `NEXT_PUBLIC_APP_URL` to the address your Chromecast can reach (usually your tower LAN IP and public port, e.g. `http://192.168.0.19:8096`). If unset, Rushify falls back to `window.location.origin`.

Cast stream URL pattern:

```text
{NEXT_PUBLIC_APP_URL}/api/stream/cast/{token}
```

Tokens expire after 5 minutes and are created via authenticated `POST /api/cast/token`.

### Connecting your media library

Rushify does **not** require a Rushify account, sign-in, or server claim. It is a self-hosted BFF that reads your library through environment variables:

1. **Server URL** â€” the address where your media server listens, usually `http://192.168.x.x:8096` on your home network. You can skip guessing: open **Settings** and click **Scan for Library Server**; Rushify probes common local addresses read-only and shows a copyable `JELLYFIN_SERVER_URL=` line for your `.env` file.
2. **API key** â€” create one in your media server's admin dashboard under **Dashboard â†’ Advanced â†’ API Keys**, name it `Rushify`, and paste the key into your `.env` file.

Your API key stays on the server. The browser never sees it.

#### Auto-discovery

If `JELLYFIN_SERVER_URL` is not set, Rushify can locate a media server on port **8096** automatically:

- Probes localhost, Docker hostnames, LAN IPs, and optional `JELLYFIN_DISCOVERY_URLS`
- Uses Jellyfin's public `/System/Info/Public` endpoint (no API key required for the scan)
- Caches results in memory for 5 minutes
- Discovery is read-only network probing â€” no filesystem or media access

Persist the discovered URL in `.env` so it survives restarts. You still need `JELLYFIN_API_KEY` for authenticated library access.

#### URL examples

| Setup | Example URL |
| --- | --- |
| Same machine, local dev | `http://localhost:8096` |
| LAN / homelab | `http://192.168.1.100:8096` |
| Docker on same host | `http://host.docker.internal:8096` |
| Docker Compose (shared network) | `http://jellyfin:8096` |
| unRAID | Your tower's LAN IP with port 8096, e.g. `http://192.168.1.50:8096` |

After saving your `.env` file, restart Rushify and open **Settings** (`/settings`) to verify the connection status.

### Jellyfin playback quality (recommended)

Rushify now defaults to **Auto** quality: Direct Play first, HLS transcode fallback only when needed. For best results on your unRAID tower, verify these Jellyfin dashboard settings:

| Setting | Location | Recommended |
| --- | --- | --- |
| Hardware acceleration | Dashboard â†’ Playback â†’ Transcoding | **Intel Quick Sync (QSV)** on i7-12700K |
| Enable hardware decoding | Same page | On |
| Enable hardware encoding | Same page | On |
| Transcoding throttling | Dashboard â†’ Playback | **Off** for LAN |
| Max streaming bitrate | Dashboard â†’ Playback | 120 Mbps or higher for local network |

**Docker / unRAID:** Pass through the GPU for Quick Sync:

```yaml
devices:
  - /dev/dri:/dev/dri
```

Add to your Jellyfin template (Extra Parameters or `--device=/dev/dri:/dev/dri`). Without `/dev/dri`, Jellyfin falls back to CPU transcoding â€” noticeably softer than Plex with hardware acceleration.

Current server check (via SSH): `HardwareAccelerationType` was `none` and no `/dev/dri` device was mounted in the Jellyfin container. Enabling QSV in the dashboard alone will not help until the GPU device is passed through.

Rushify stream URLs (Auto mode):

- **Direct Play:** `/Videos/{id}/stream?Static=true` â€” original file, no transcode
- **Adaptive HLS fallback:** `/Videos/{id}/master.m3u8` with `EnableDirectPlay=true`, HEVC when the browser supports it, 120 Mbps LAN cap, 5.1 audio

Use the quality selector on the watch page: **Auto | Original (Direct) | 1080p | 720p | 480p**.

## Development

```bash
npm install
cp .env.example .env.local
# Add JELLYFIN_API_KEY; set JELLYFIN_SERVER_URL or use Settings â†’ Scan for Library Server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and check [http://localhost:3000/settings](http://localhost:3000/settings) for connection status.

## Production (Docker / unRAID)

Rushify is the **public face on port 8096** (via Caddy). Jellyfin API runs on **8097**.

See [deploy/unraid/README-UNRAID.md](deploy/unraid/README-UNRAID.md) for full deploy steps.

```bash
cp deploy/unraid/.env.production .env
bash deploy/unraid/migrate-jellyfin-port.sh   # first time only
bash deploy/unraid/deploy.sh
```

Open `http://YOUR_TOWER_IP:8096/` â€” Live TV, Library, and Login all on one port.

### Multi-user auth

Set `RUSHIFY_USERS` in `.env` (server-side JSON):

```json
[
  {"username":"admin","password":"admin","role":"admin"},
  {"username":"benjamin","password":"rushify2024","role":"user"}
]
```

- **admin** â€” full access including Settings
- **user** â€” Home, Library, Live TV only

To add users, append to the JSON array and redeploy. See unRAID README.

### Security (before port forwarding)

| Layer | How |
|-------|-----|
| HTTPS | `RUSHIFY_TLS=true` in `.env` â€” Caddy self-signed cert on :8096 |
| Login rate limit | Built-in: 10 attempts/minute per IP |
| VPN (recommended) | Tailscale â€” access `http://100.x.x.x:8096`, no port forward |
| Domain | Cloudflare Tunnel + Access â€” see unRAID README |

### Android PWA

See [README-ANDROID.md](README-ANDROID.md) â€” Chrome â†’ Add to Home screen at `:8096`.

## Peppers shop

Standalone Next.js storefront in [`peppers/`](peppers/) â€” deployed on Cloudflare (direct Wrangler, no GitHub):

- **Production:** https://midlifepeptide.pages.dev
- **Target domain:** https://peppers.pages.dev (shown in shop UI; legacy Vite site until subdomain is reclaimed â€” see [`peppers/README.md`](peppers/README.md))
- **Local:** `cd peppers && npm run dev` â†’ http://localhost:3001
- **Deploy:** `cd peppers && npm run deploy` (see [`peppers/README.md`](peppers/README.md))


## Guardrails

- Read-only client: no local media scanning, DB creation, or asset writes
- RAM/CPU safety: IPTV ingestion is cache-first with background refresh
- Data isolation: browser -> Rushify API -> upstream services
- White-label UI: no upstream product branding in the interface

## Next implementation phases

1. Jellyfin library endpoints (continue watching, libraries, item metadata)
2. Incremental M3U/XMLTV parsers with progress callbacks
3. Video player integration and watch progress UI
4. Authentication/multi-user support beyond env-based server keys

