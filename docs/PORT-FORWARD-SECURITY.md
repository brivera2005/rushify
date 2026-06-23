# Port-forward security guide

Rushify is designed for homelab use. Exposing it to the internet requires layered protection.

## Recommended access methods (best → good)

### 1. Tailscale VPN (best)

No port forward needed. Install Tailscale on unRAID and your devices, access Rushify at the Tailscale IP on port 8096.

### 2. Cloudflare Tunnel (good)

Hides your home IP and adds DDoS protection. Run `cloudflared` on unRAID pointing to `http://127.0.0.1:8096`.

### 3. Port forward 8096 (use with caution)

Only forward **8096 → Caddy → Rushify**. Never expose Jellyfin (8097), unRAID (80/443), or IPTV upstream URLs.

## Checklist before port forwarding

- [ ] Enable HTTPS — set `RUSHIFY_TLS=true` (self-signed LAN) or use a domain + Let's Encrypt in Caddy
- [ ] Set strong passwords on all `RUSHIFY_USERS` accounts
- [ ] Enable optional PIN gate: `RUSHIFY_ACCESS_PIN=your-pin` in `.env`
- [ ] Confirm login rate limit (5/min) and IP ban after 10 failures (built into Rushify)
- [ ] Confirm general API rate limit (100/min per IP, built into Rushify)
- [ ] Keep IPTV/Xtream credentials server-side only (already the case — never in browser)
- [ ] Consider HTTP basic auth in Caddy as a second wall (see `deploy/unraid/Caddyfile`)
- [ ] Consider fail2ban on unRAID for repeated scan attempts
- [ ] Do **not** expose Jellyfin 8097 or unRAID web UI to the internet

## Enable TLS

**Self-signed (LAN / quick test):**

```env
RUSHIFY_TLS=true
```

Redeploy. Caddy serves HTTPS on port 8096 with a self-signed cert. Browsers will warn — accept for LAN use.

**Let's Encrypt (port forward + domain):**

1. Point `rushify.yourdomain.com` A record to your public IP
2. Forward external 443 or 8096 to unRAID 8096
3. Edit `deploy/unraid/Caddyfile.tls` — replace `:8096` block with your domain and ACME email
4. Set `RUSHIFY_TLS=true` and redeploy

## Enable access PIN gate

Add to `.env` on unRAID:

```env
RUSHIFY_ACCESS_PIN=1234
```

Unauthenticated visitors must enter the PIN at `/gate` before reaching `/login`. Cookie lasts 24 hours.

Remove or leave blank to disable.

## Optional Caddy HTTP basic auth

Uncomment the `basicauth` block in `deploy/unraid/Caddyfile` and generate a hash:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'your-password'
```

Paste the hash into the Caddyfile and redeploy Caddy.

## What Rushify enforces

| Layer | Protection |
|-------|------------|
| Caddy | Bot path blocking, security headers, CSP |
| Rushify middleware | 100 req/min per IP, optional PIN gate |
| Login API | 5 attempts/min per IP, 15-min ban after 10 failures |
| IPTV refresh API | 1 refresh/min per user |
| Session cookies | `Secure` when `RUSHIFY_TLS=true` |

See also [README-SECURITY.md](../README-SECURITY.md) in the repo root.
