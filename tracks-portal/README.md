# RushTracks Portal

Companion web portal for RushTV **Tracks** — curated book→film journeys scanned from the TV app.

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
| `/` | Landing — hero, What are Tracks?, grid of all 35 tracks |
| `/track/[id]` | Vertical timeline for one track (books + film/show/doc items) |

## Data

Edit `public/tracks.json` and mirror to `src/data/tracks.json` (or copy from `tv-media-hub/app/src/main/assets/tracks/tracks.json`).

The Android app loads the same JSON from assets and encodes QR URLs as `https://rushtracks.pages.dev/track/{id}`.
