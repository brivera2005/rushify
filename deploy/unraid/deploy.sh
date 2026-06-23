#!/bin/bash
# Run ON unRAID: bash /mnt/user/appdata/rushify/deploy/unraid/deploy.sh
set -euo pipefail

APP_DIR="/mnt/user/appdata/rushify"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  if [[ -f deploy/unraid/.env.production ]]; then
    cp deploy/unraid/.env.production .env
    echo "Created .env from deploy/unraid/.env.production — edit credentials if needed."
  else
    echo "Missing .env — copy .env.production to .env and configure IPTV/Jellyfin."
    exit 1
  fi
fi

# Ensure RUSHIFY_USERS JSON is valid (common pitfall when hand-editing .env)
if ! grep -q '"username"' .env 2>/dev/null || ! grep -q '^RUSHIFY_USERS=\[' .env; then
  echo "Fixing RUSHIFY_USERS in .env..."
  bash "$APP_DIR/deploy/unraid/fix-users-env.sh" 2>/dev/null || true
fi

# Recover Jellyfin API key after container recreate (movies/shows won't load without it)
if ! grep -qE '^RUSHIFY_PUBLIC_URL=' .env 2>/dev/null; then
  echo "RUSHIFY_PUBLIC_URL=http://192.168.0.19:8096" >> .env
  echo "Set RUSHIFY_PUBLIC_URL in .env for remote client access."
fi

if ! grep -qE '^JELLYFIN_API_KEY=.+$' .env 2>/dev/null; then
  JELLYFIN_DB="/mnt/user/appdata/jellyfin/data/data/jellyfin.db"
  if [[ -f "$JELLYFIN_DB" ]] && command -v sqlite3 >/dev/null; then
    KEY="$(sqlite3 "$JELLYFIN_DB" "SELECT AccessToken FROM ApiKeys WHERE Name='Rushify' ORDER BY rowid DESC LIMIT 1;" 2>/dev/null || true)"
    if [[ -n "$KEY" ]]; then
      if grep -qE '^#?[[:space:]]*JELLYFIN_API_KEY=' .env; then
        sed -i "s|^#\\?[[:space:]]*JELLYFIN_API_KEY=.*|JELLYFIN_API_KEY=${KEY}|" .env
      else
        echo "JELLYFIN_API_KEY=${KEY}" >> .env
      fi
      echo "Auto-set JELLYFIN_API_KEY from Jellyfin database."
    else
      echo "WARNING: JELLYFIN_API_KEY missing — create an API key named 'Rushify' in Jellyfin Dashboard → Advanced."
    fi
  fi
fi

# Live TV: direct Xtream playback (Jellyfin live TV is slow/unreliable for 16k Xtream channels)
if grep -qE '^IPTV_BACKEND=(auto|jellyfin)' .env 2>/dev/null; then
  sed -i 's|^IPTV_BACKEND=.*|IPTV_BACKEND=direct|' .env
  echo "Set IPTV_BACKEND=direct for fast Xtream live playback."
  rm -f "$APP_DIR/cache/channels.json.gz" "$APP_DIR/cache/epg.json.gz" 2>/dev/null || true
  echo "Cleared IPTV cache (channel IDs change from jf-* to xtream-*)."
elif ! grep -qE '^IPTV_BACKEND=' .env 2>/dev/null; then
  echo "IPTV_BACKEND=direct" >> .env
  echo "Added IPTV_BACKEND=direct (missing from .env)."
fi

# Ensure critical IPTV/live defaults (code defaults differ — must be explicit in production)
for kv in "IPTV_DIRECT_SEGMENTS=false" "IPTV_US_ONLY=true" "IPTV_ENGLISH_ONLY=true" "NODE_ENV=production"; do
  key="${kv%%=*}"
  if ! grep -qE "^${key}=" .env 2>/dev/null; then
    echo "$kv" >> .env
    echo "Added missing $key to .env."
  fi
done
if grep -qE '^NODE_ENV=development' .env 2>/dev/null; then
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env
  echo "Fixed NODE_ENV development → production."
fi

if ! grep -qE '^IPTV_XTREAM_URL=.+$' .env 2>/dev/null; then
  if grep -qE '^IPTV_XTREAM_URL=' deploy/unraid/.env.production 2>/dev/null; then
    XTREAM_URL="$(grep '^IPTV_XTREAM_URL=' deploy/unraid/.env.production | cut -d= -f2-)"
    echo "IPTV_XTREAM_URL=${XTREAM_URL}" >> .env
    echo "Set IPTV_XTREAM_URL from .env.production."
  else
    echo "WARNING: IPTV_XTREAM_URL missing — live TV will not work."
  fi
fi

# Jellyfin on 8097 after port migration
if grep -qE 'JELLYFIN_SERVER_URL=.*:8096' .env 2>/dev/null; then
  sed -i 's|JELLYFIN_SERVER_URL=\(.*\):8096|JELLYFIN_SERVER_URL=\1:8097|' .env
  echo "Fixed JELLYFIN_SERVER_URL port 8096 → 8097."
fi

# Source env for port/TLS settings
set -a
# shellcheck disable=SC1091
source .env
set +a

PUBLIC_PORT="${PUBLIC_PORT:-8096}"
RUSHIFY_TLS="${RUSHIFY_TLS:-false}"

if [[ "$RUSHIFY_TLS" == "true" ]]; then
  cp deploy/unraid/Caddyfile.tls deploy/unraid/Caddyfile.active
  echo "TLS enabled — using self-signed cert on port ${PUBLIC_PORT}."
else
  cp deploy/unraid/Caddyfile deploy/unraid/Caddyfile.active
fi

echo "Generating PWA icons..."
node scripts/generate-pwa-icons.mjs 2>/dev/null || true

echo "Creating cache and data directories..."
mkdir -p "$APP_DIR/cache" "$APP_DIR/data/user-prefs"
chown -R 1001:1001 "$APP_DIR/cache" "$APP_DIR/data" 2>/dev/null || chmod -R 777 "$APP_DIR/cache" "$APP_DIR/data"

echo "Clearing IPTV disk cache (region filter rebuild)..."
rm -f "$APP_DIR/cache/channels.json.gz" "$APP_DIR/cache/epg.json.gz" 2>/dev/null || true

echo "Building rushify image..."
docker build -t rushify:latest \
  --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://192.168.0.19:8096}" \
  --build-arg "NEXT_PUBLIC_GOOGLE_CAST_APP_ID=${NEXT_PUBLIC_GOOGLE_CAST_APP_ID:-CC1AD845}" \
  .

echo "Stopping old containers (if any)..."
docker stop rushify-caddy 2>/dev/null || true
docker rm rushify-caddy 2>/dev/null || true
docker stop rushify 2>/dev/null || true
docker rm rushify 2>/dev/null || true

echo "Creating Docker network..."
docker network inspect rushify-net >/dev/null 2>&1 || docker network create rushify-net

echo "Starting rushify (internal)..."
docker run -d \
  --name rushify \
  --restart unless-stopped \
  --network rushify-net \
  --env-file "$APP_DIR/.env" \
  -e RUSHIFY_CACHE_DIR=/app/cache \
  -e RUSHIFY_DATA_DIR=/app/data \
  -v "$APP_DIR/cache:/app/cache" \
  -v "$APP_DIR/data:/app/data" \
  --add-host host.docker.internal:host-gateway \
  rushify:latest

echo "Starting Caddy on port ${PUBLIC_PORT}..."
docker run -d \
  --name rushify-caddy \
  --restart unless-stopped \
  --network rushify-net \
  -p "${PUBLIC_PORT}:8096" \
  -v "$APP_DIR/deploy/unraid/Caddyfile.active:/etc/caddy/Caddyfile:ro" \
  -v rushify_caddy_data:/data \
  -v rushify_caddy_config:/config \
  caddy:2-alpine

echo ""
echo "Rushify is live on port ${PUBLIC_PORT}:"
echo "  Home:     http://192.168.0.19:${PUBLIC_PORT}/"
echo "  Movies:   http://192.168.0.19:${PUBLIC_PORT}/movies"
echo "  Shows:    http://192.168.0.19:${PUBLIC_PORT}/shows"
echo "  Live:     http://192.168.0.19:${PUBLIC_PORT}/live/guide"
echo "  Channels: http://192.168.0.19:${PUBLIC_PORT}/live/channels"
echo "  Login:    http://192.168.0.19:${PUBLIC_PORT}/login"
echo "  Health:   http://192.168.0.19:${PUBLIC_PORT}/api/health"
echo ""
echo "Jellyfin API should be on port 8097 (not 8096)."
docker ps --filter name=rushify --filter name=rushify-caddy

if [[ -x "$APP_DIR/deploy/unraid/verify-live.sh" ]]; then
  echo ""
  echo "Running post-deploy live verification..."
  bash "$APP_DIR/deploy/unraid/verify-live.sh" "http://127.0.0.1:${PUBLIC_PORT}" || true
fi

if [[ -x "$APP_DIR/deploy/unraid/verify-deploy.sh" ]]; then
  echo ""
  echo "Running full deploy verification..."
  bash "$APP_DIR/deploy/unraid/verify-deploy.sh" "http://127.0.0.1:${PUBLIC_PORT}" || true
fi

if [[ -x "$APP_DIR/deploy/unraid/verify-5-channels.sh" ]]; then
  echo ""
  echo "Testing 5 major live channels..."
  bash "$APP_DIR/deploy/unraid/verify-5-channels.sh" "http://127.0.0.1:${PUBLIC_PORT}" || true
fi

if [[ -x "$APP_DIR/deploy/unraid/verify-library.sh" ]]; then
  echo ""
  echo "Testing Jellyfin library..."
  bash "$APP_DIR/deploy/unraid/verify-library.sh" "http://127.0.0.1:${PUBLIC_PORT}" || true
fi
