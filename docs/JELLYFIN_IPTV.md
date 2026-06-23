# Jellyfin & Live TV — Rushify architecture

## Target

**Rushify = white-label UI only. Media engine (Jellyfin) = all media backend.**

| Feature | Backend | Rushify role |
|---------|---------|--------------|
| Movies | Jellyfin API | Branded browse/play |
| TV Shows | Jellyfin API | Branded browse/play |
| Live TV | Jellyfin Live TV | Branded guide/channels |
| EPG | Jellyfin `/LiveTv/Programs` | Branded TV guide grid |
| Playback | Jellyfin stream URLs via `/api/jellyfin/...` | Player + Cast |
| Provider creds | Jellyfin tuner config + server `.env` | Never in client |

## Rushify Live TV flow (`IPTV_BACKEND=auto`)

1. **Try Jellyfin** — `src/lib/jellyfin/livetv.ts` reads `/LiveTv/Channels` and `/LiveTv/Programs`
2. **Fallback** — if engine has no channels, use server-side Xtream BFF (existing `xtream.ts`)
3. **Admin only** — Settings shows `backend: jellyfin | direct` and `directFallback` flag

## Jellyfin setup on unRAID

Some providers block the `get.php?type=m3u_plus` URL (HTTP 884) while the player API works.
Use the setup script to generate a local M3U from the API:

```bash
bash /mnt/user/appdata/rushify/deploy/unraid/setup-jellyfin-livetv.sh
```

This script:

1. Generates `/mnt/user/appdata/jellyfin/cache/iptv/rushify.m3u` from `player_api.php`
2. Adds M3U tuner (`file://…`) to Jellyfin
3. Adds XMLTV guide provider (`xmltv.php`)
4. Triggers `/LiveTv/Refresh`
5. Verifies `/LiveTv/Channels` count

### Manual dashboard steps (alternative)

1. Dashboard → Live TV → Tuner Devices → **M3U Tuner**
2. Playlist URL: local file from script above, or provider M3U if it works
3. Dashboard → Live TV → Guide Providers → **XMLTV**
4. URL: `http://provider/xmltv.php?username=…&password=…`
5. Map channels if auto-match fails

## Environment

```env
IPTV_BACKEND=auto          # auto | jellyfin | direct
JELLYFIN_SERVER_URL=http://192.168.0.19:8097
JELLYFIN_API_KEY=…

# Provider creds — engine setup + direct fallback only (server-side)
IPTV_XTREAM_URL=http://provider
IPTV_XTREAM_USERNAME=…
IPTV_XTREAM_PASSWORD=…
```

## Known blocker (RiveraStreams / justanothergod.com)

- `player_api.php` — works (~18k streams)
- `get.php?type=m3u_plus` — returns **HTTP 884** (Jellyfin M3U validation fails on remote URL)
- `xmltv.php` — works (~76MB guide)

**Workaround:** `setup-jellyfin-livetv.sh` generates M3U locally from the API.

## Stream URLs

| Source | Channel ID | Playback |
|--------|------------|----------|
| Jellyfin | `jf-{guid}` | `/api/jellyfin/Videos/{guid}/master.m3u8?…` |
| Direct fallback | `xtream-{id}` | `/api/stream/iptv/xtream-{id}` |
