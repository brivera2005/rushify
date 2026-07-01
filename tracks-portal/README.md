# RushTracks Portal

Companion web portal for RushTV **Tracks**: curated book→film journeys scanned from the TV app.

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

- `RUSHTRACKS_GATE_SECRET` — shared with RushTV `BuildConfig` / CI secret of the same name
- `TRACKS_MASTER_PIN` — permanent 6-digit fallback PIN (set via `npx wrangler pages secret put TRACKS_MASTER_PIN --project-name=rushtracks`); not embedded in the Android app
- KV binding `TRACKS_PINS` — create with `npx wrangler kv namespace create TRACKS_PINS` and paste ids into `wrangler.toml`

## Data

Edit `public/tracks.json` and mirror to `src/data/tracks.json` (or copy from `tv-media-hub/app/src/main/assets/tracks/tracks.json`).

The Android app encodes a single QR URL to `https://rushtracks.pages.dev/` and displays a rotating PIN for manual entry.
