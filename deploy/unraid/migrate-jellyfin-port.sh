#!/bin/bash
# Move Jellyfin from host port 8096 → 8097 so Rushify/Caddy can own 8096.
# Run ON unRAID: bash /mnt/user/appdata/rushify/deploy/unraid/migrate-jellyfin-port.sh
set -euo pipefail

JELLYFIN_PORT="${JELLYFIN_PORT:-8097}"

if docker ps --format '{{.Names}}' | grep -qx jellyfin; then
  echo "Stopping existing Jellyfin container..."
  docker stop jellyfin
  docker rm jellyfin
fi

echo "Starting Jellyfin on host port ${JELLYFIN_PORT}..."
docker run -d \
  --name jellyfin \
  --restart unless-stopped \
  -p "${JELLYFIN_PORT}:8096" \
  -v /mnt/user/appdata/jellyfin:/config \
  -v /mnt/disk1/media/movies:/data/movies \
  -v /mnt/disk1/media/tv:/data/tv \
  -v /mnt/disk1/media/music:/data/music \
  -e PUID=99 \
  -e PGID=100 \
  lscr.io/linuxserver/jellyfin:latest

echo ""
echo "Jellyfin is now at http://192.168.0.19:${JELLYFIN_PORT}"
echo "Update Rushify .env: JELLYFIN_SERVER_URL=http://192.168.0.19:${JELLYFIN_PORT}"
echo ""
echo "If movies/shows stop loading, ensure JELLYFIN_API_KEY is set in Rushify .env"
echo "(deploy.sh auto-syncs from Jellyfin DB when an API key named 'Rushify' exists)."
