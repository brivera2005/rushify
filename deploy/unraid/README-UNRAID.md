# Rushify on unRAID (192.168.0.19)

Rushify is the **public face on port 8096**. Jellyfin API runs on **8097** (library backend only).

## URLs (after deploy)

| Page | URL |
|------|-----|
| Home | http://192.168.0.19:8096/ |
| Live TV | http://192.168.0.19:8096/live |
| TV Guide | http://192.168.0.19:8096/live/guide |
| Library | http://192.168.0.19:8096/library |
| Login | http://192.168.0.19:8096/login |
| Health | http://192.168.0.19:8096/api/health |

## Architecture

```text
Phone/Browser → :8096 Caddy → rushify:3000 (Next.js BFF)
                              ↓
                    Jellyfin API :8097 (internal)
                    Xtream IPTV (server-side credentials)
```

## Appdata path

```
/mnt/user/appdata/rushify
```

## First-time deploy

1. Copy project to unRAID (from PC):

   ```powershell
   cd C:\Users\Benjamin\Projects\rushify
   tar -czf $env:TEMP\rushify-deploy.tar.gz --exclude=node_modules --exclude=.next --exclude=.git .
   scp $env:TEMP\rushify-deploy.tar.gz root@192.168.0.19:/mnt/user/appdata/rushify/
   ```

2. On unRAID:

   ```bash
   cd /mnt/user/appdata/rushify
   tar xzf rushify-deploy.tar.gz
   cp deploy/unraid/.env.production .env
   # Edit .env — add JELLYFIN_API_KEY, verify RUSHIFY_USERS
   bash deploy/unraid/migrate-jellyfin-port.sh   # moves Jellyfin 8096→8097
   bash deploy/unraid/deploy.sh
   ```

## Multi-user auth

Set `RUSHIFY_USERS` in `.env` (JSON array, server-side only):

```json
[
  {"username":"admin","password":"admin","role":"admin"},
  {"username":"benjamin","password":"rushify2024","role":"user"}
]
```

| User | Password | Access |
|------|----------|--------|
| admin | admin | Home, Library, Live TV, Settings |
| benjamin | rushify2024 | Home, Library, Live TV |

**Add more users:** append to the JSON array in `.env`, then `bash deploy/unraid/deploy.sh`.

Roles: `"admin"` (Settings access) or `"user"` (Library + Live only).

## Environment

| Variable | Description |
|----------|-------------|
| `PUBLIC_PORT` | Host port for Caddy (default **8096**) |
| `RUSHIFY_TLS` | `true` = HTTPS self-signed + Secure cookies |
| `RUSHIFY_USERS` | JSON user list (preferred over legacy admin vars) |
| `JELLYFIN_SERVER_URL` | `http://192.168.0.19:8097` after port migration |
| `SESSION_COOKIE_SECURE` | Auto `true` when `RUSHIFY_TLS=true`; set `false` for plain HTTP |

## Security (before port forwarding)

### A. HTTPS on LAN

Set in `.env`:

```bash
RUSHIFY_TLS=true
SESSION_COOKIE_SECURE=true
```

Redeploy — Caddy serves self-signed TLS on :8096. Accept the cert once on each device.

### B. Login hardening

Built-in: 10 attempts/minute per IP on `/api/auth/login`.

### C. Tailscale (recommended over raw port forward)

Install Tailscale on unRAID and phone. Access via `http://100.x.x.x:8096` — no router port forward needed.

### D. Cloudflare Tunnel (if you have a domain)

```bash
cloudflared tunnel --url http://localhost:8096
```

Point DNS to the tunnel; enable Cloudflare Access for an extra auth layer. See main README.

## Jellyfin port migration

Rushify owns **8096**. Jellyfin must move to **8097**:

```bash
bash deploy/unraid/migrate-jellyfin-port.sh
```

Update `.env`: `JELLYFIN_SERVER_URL=http://192.168.0.19:8097`

## Update / redeploy

```bash
cd /mnt/user/appdata/rushify
# re-copy updated source, then:
bash deploy/unraid/deploy.sh
```

## Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.0.19:8096/api/health
curl -s http://192.168.0.19:8096/api/iptv/status
```

Expected: HTTP 200, `"channelCount"` > 0.

## Jellyfin transcoding (Quick Sync)

Rushify prefers Direct Play; Jellyfin only transcodes when the client cannot decode the source. For Plex-like quality when transcoding is unavoidable:

1. **Pass GPU into Jellyfin** — add `/dev/dri:/dev/dri` to the Jellyfin Docker container (Intel iGPU for Quick Sync).
2. **Dashboard → Playback → Transcoding** — set hardware acceleration to **Intel Quick Sync Video (QSV)**, enable hardware decode/encode, disable transcoding throttling on LAN.
3. Restart Jellyfin after changing acceleration.

Verify on the server:

```bash
grep HardwareAccelerationType /mnt/user/appdata/jellyfin/encoding.xml
docker inspect jellyfin --format '{{json .HostConfig.Devices}}'
```

Should show `qsv` (or `vaapi`) and `[{"PathOnHost":"/dev/dri",...}]`.

## PWA on Android

See [README-ANDROID.md](../../README-ANDROID.md) — Chrome → Add to Home screen at :8096.
