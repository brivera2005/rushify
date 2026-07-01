# RushTracks Portal

Companion web portal for RushTV **Tracks**: curated paths for the discerning through books, film, and television.

**Live:** [rushtracks.pages.dev](https://rushtracks.pages.dev)

## Stack

- [Astro](https://astro.build) (static)
- Tailwind CSS
- Data: `public/tracks.json` + `src/data/tracks.json` (build import)

## Local dev

```bash
cd tracks-portal
npm install
npm run dev
```

Open http://localhost:4321

## Build

```bash
npm run build
npm run preview
```

## Deploy to Cloudflare Pages

### One-time setup

1. Create a Cloudflare Pages project named `rushtracks` (or match `wrangler.toml`).
2. Custom domain: `rushtracks.pages.dev` (default `*.pages.dev` subdomain works out of the box).

### CLI deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=rushtracks
```

Or:

```bash
npm run deploy
```

Set `CLOUDFLARE_API_TOKEN` with Pages edit permission for non-interactive deploys.

### Git integration (optional)

Connect the `rushify` repo to Cloudflare Pages:

- **Build command:** `cd tracks-portal && npm ci && npm run build`
- **Output directory:** `tracks-portal/dist`
- **Root directory:** `/` (monorepo) or set project root to `tracks-portal`

## Routes

| Path | Description |
|------|-------------|
| `/gate` | PIN entry (shown when no session cookie) |
| `/` | Landing: hero, What are Tracks?, grid of all tracks (gated) |
| `/track/[id]` | Vertical timeline for one track (gated) |
| `POST /api/pin` | Register PIN (TV, Bearer secret) or verify PIN (landing) |

## PIN gate

1. RushTV Tracks tab: tap QR icon → generates a 6-digit PIN and registers it with the Worker.
2. TV shows QR to `https://rushtracks.pages.dev/` plus the rotating PIN (master PIN is never shown on TV).
3. Phone: scan QR (lands on `/gate`) or open the site and enter the PIN.
4. Worker sets `tracks_session` HttpOnly cookie (7 days).
5. Opening QR again registers a new PIN; the previous rotating PIN stops working immediately.

Verification accepts either the current rotating PIN (KV `active_pin`, 10-minute TTL) **or** the master PIN configured in Worker secrets. The master PIN always works for manual entry without opening the TV QR flow.

### Worker secrets (Cloudflare Pages → Settings → Environment variables)

- `RUSHTRACKS_GATE_SECRET`: shared with RushTV `BuildConfig` / CI secret of the same name
- `TRACKS_MASTER_PIN`: permanent 6-digit fallback PIN (set via `npx wrangler pages secret put TRACKS_MASTER_PIN --project-name=rushtracks`); not embedded in the Android app
- `PLEX_SERVER_URL` (or `PLEX_URL`): Plex Media Server base URL — powers **Available on RushTV** vs **Request on RushTV** buttons. Must be reachable from Cloudflare Workers (use your NPM/Cloudflare-proxied hostname, not a LAN-only `192.168.x.x` URL). Homelab default: `http://192.168.0.19:32400` (set a public proxy URL in production).
- `PLEX_TOKEN`: Plex `X-Plex-Token` with library read access (Plex Web → any item → **View XML** → copy token from URL; see [pulsarr-plex-sync.md](../deploy/unraid/pulsarr-plex-sync.md))
- `JELLYFIN_SERVER_URL` / `JELLYFIN_API_KEY` (optional): Jellyfin fallback when Plex secrets are absent
- KV binding `TRACKS_PINS`: create with `npx wrangler kv namespace create TRACKS_PINS` and paste ids into `wrangler.toml`

## Data

**Source of truth:** `src/data/tracks.json` (canonical track definitions)

Build pipeline:

1. `node scripts/merge-tracks.mjs` — merges new tracks, v2 links, branching maps
2. `node scripts/enrich-tracks.mjs` — TMDB + Open Library metadata at build time
3. Outputs `public/tracks.json` (for app sync) and `src/data/tracks-enriched.json` (for pages)

Sync to Android app:

```bash
cp public/tracks.json ../tv-media-hub/app/src/main/assets/tracks/tracks.json
```

### Track schema

```json
{
  "id": "existential-ai",
  "title": "...",
  "description": "...",
  "tags": ["sci-fi", "v2", "kids", "teens"],
  "relatedTrackIds": ["existential-ai-v2"],
  "sequence": [
    { "id": "item-1", "type": "book", "title": "...", "author": "..." },
    { "id": "fork-1", "type": "crossroads", "label": "Choose your path", "choices": [
      { "label": "Read first", "targetId": "item-2", "vibe": "book-heavy" },
      { "label": "Play side quest", "targetId": "game-1", "vibe": "videogame", "optional": true }
    ]},
    { "id": "game-1", "type": "videogame", "title": "...", "year": 2018, "required": false }
  ],
  "map": {
    "nodes": [{ "id": "n0", "itemId": "item-1", "layer": 0, "slot": 1 }],
    "edges": [{ "from": "n0", "to": "n1" }]
  }
}
```

**Item types:** `book | movie | show | documentary | boardgame | videogame | crossroads`

**Build-time metadata** (on enriched pages only): `posterUrl`, `coverUrl`, `genres`, `rating`, `amazonUrl` (books, tag `tomewizard-20`), `tmdbId`, `mediaType`

### RushTV deep links

Film and series cards link into RushTV (`com.tvmhub.media`) instead of TMDB:

```
rushtv://detail?tmdb=movie:603
rushtv://detail?tmdb=tv:1399
```

Optional auto-request: `&action=request` (requires RushTV app support).

The static portal checks Plex (primary) at runtime via `GET /api/availability?ids=movie:603,tv:1399` (Worker; `/api/` is allowed without PIN). Film/series cards show **Available on RushTV** (copper, play deep link) or **Request on RushTV** (amber outline, `&action=request`). Without Plex/Jellyfin secrets, buttons default to Request.

Set secrets via Cloudflare dashboard or CLI:

```bash
npx wrangler pages secret put PLEX_SERVER_URL --project-name=rushtracks
npx wrangler pages secret put PLEX_TOKEN --project-name=rushtracks
```

Logo assets: `public/rushtv-logo.png` (from `tv-media-hub/app/src/main/res/drawable/rushtv_logo.png`, black-background RushTV wordmark), `public/favicon.png` (from `tv-media-hub` launcher icon — not Vaulty/Kodi branding).

### TMDB setup

Set `TMDB_API_KEY` in repo root `.env` or `tracks-portal/.env` before build. Without it, books still get Open Library covers and Amazon links; film/TV cards show titles only.

Get a key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

Path choices persist in `localStorage` per track (`rushtracks-path-{id}`).

Edit `src/data/tracks.json` and run `npm run build`. The Android app encodes a single QR URL to `https://rushtracks.pages.dev/` and displays a rotating PIN for manual entry.
