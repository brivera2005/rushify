# Rushify security

Server-side protections built into Rushify and Caddy for homelab and port-forward deployments.

## Authentication

- User credentials live in `RUSHIFY_USERS` (JSON in `.env`) — never sent to the browser
- IPTV/Xtream credentials are server-side only
- Session cookie is httpOnly; `Secure` flag when `RUSHIFY_TLS=true`

## Rate limiting (Rushify app)

| Endpoint / scope | Limit |
|------------------|-------|
| `/api/auth/login` | 5 requests/min per IP |
| All authenticated API routes | 100 requests/min per IP |
| `/api/iptv/refresh` | 1 request/min per user |
| Failed logins | IP banned 15 min after 10 failures |

## Optional access PIN (`RUSHIFY_ACCESS_PIN`)

When set, visitors must pass `/gate` before `/login`. Useful as an extra layer when port forwarding.

```env
RUSHIFY_ACCESS_PIN=your-pin
```

## TLS (`RUSHIFY_TLS`)

```env
RUSHIFY_TLS=true
```

Caddy serves HTTPS (self-signed by default). Required for secure cookies over the internet.

For Let's Encrypt with a domain, see [docs/PORT-FORWARD-SECURITY.md](docs/PORT-FORWARD-SECURITY.md).

## Caddy (reverse proxy)

- Blocks common bot/scanner paths (`/.env`, `/wp-admin`, etc.) → 404
- Security headers: X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy
- HSTS when TLS enabled
- Optional HTTP basic auth (commented in `deploy/unraid/Caddyfile`)

## Port forward recommendations

1. **Best:** Tailscale — no port forward
2. **Good:** Cloudflare Tunnel
3. **If forwarding 8096:** HTTPS + strong passwords + `RUSHIFY_ACCESS_PIN` + only forward 8096

Full checklist: [docs/PORT-FORWARD-SECURITY.md](docs/PORT-FORWARD-SECURITY.md)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `RUSHIFY_TLS` | Enable HTTPS via Caddy |
| `RUSHIFY_ACCESS_PIN` | Optional PIN gate before login |
| `SESSION_COOKIE_SECURE` | Auto `true` when TLS enabled |
| `IPTV_MAX_SEGMENT_WAIT_MS` | Live stream segment timeout (default 8000) |
| `IPTV_CONNECT_TIMEOUT_MS` | Manifest connect timeout (default 5000) |

## unRAID deploy

Only expose port **8096** (Caddy → Rushify). Keep Jellyfin on **8097** internal.

```bash
bash /mnt/user/appdata/rushify/deploy/unraid/deploy.sh
```
