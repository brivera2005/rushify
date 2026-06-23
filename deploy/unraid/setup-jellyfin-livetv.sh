#!/usr/bin/env bash
# Configure Jellyfin Live TV on unRAID when provider M3U URL returns non-standard errors.
# Generates a local M3U from the Xtream API, adds M3U tuner + XMLTV guide to Jellyfin.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUSHIFY_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${RUSHIFY_ENV:-/mnt/user/appdata/rushify/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source <(grep -E '^(JELLYFIN_|IPTV_)' "$ENV_FILE" | sed 's/^/export /')

: "${JELLYFIN_SERVER_URL:=http://127.0.0.1:8097}"
: "${IPTV_XTREAM_URL:?IPTV_XTREAM_URL required}"
: "${IPTV_XTREAM_USERNAME:?IPTV_XTREAM_USERNAME required}"
: "${IPTV_XTREAM_PASSWORD:?IPTV_XTREAM_PASSWORD required}"

API_KEY="${JELLYFIN_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  echo "JELLYFIN_API_KEY required in $ENV_FILE" >&2
  exit 1
fi

M3U_DIR="/mnt/user/appdata/jellyfin/cache/iptv"
M3U_FILE="$M3U_DIR/rushify.m3u"
M3U_CONTAINER_PATH="/config/cache/iptv/rushify.m3u"
mkdir -p "$M3U_DIR"

echo "==> Generating M3U from provider API ($(date))"
node "$RUSHIFY_ROOT/scripts/generate-m3u-from-xtream.mjs" \
  --base "$IPTV_XTREAM_URL" \
  --user "$IPTV_XTREAM_USERNAME" \
  --pass "$IPTV_XTREAM_PASSWORD" \
  --out "$M3U_FILE"

CHANNELS=$(grep -c '^#EXTINF' "$M3U_FILE" || true)
echo "==> Wrote $CHANNELS channels to $M3U_FILE"

JF_BASE="${JELLYFIN_SERVER_URL%/}"
AUTH=(-H "X-Emby-Token: $API_KEY" -H "Content-Type: application/json")

# M3U tuner — file:// path inside Jellyfin container may differ; use host path Jellyfin can read
TUNER_JSON=$(jq -n \
  --arg url "$M3U_CONTAINER_PATH" \
  --arg name "Rushify IPTV" \
  '{Type:"m3u", Url:$url, FriendlyName:$name, EnableStreamLooping:true, TunerCount:0}')

echo "==> Adding M3U tuner to Jellyfin"
curl -sfS -X POST "${AUTH[@]}" -d "$TUNER_JSON" "$JF_BASE/LiveTv/TunerHosts" || {
  echo "Tuner add failed — may already exist. Continuing." >&2
}

XMLTV_URL="${IPTV_XTREAM_URL%/}/xmltv.php?username=${IPTV_XTREAM_USERNAME}&password=${IPTV_XTREAM_PASSWORD}"
GUIDE_JSON=$(jq -n \
  --arg path "$XMLTV_URL" \
  --arg name "Rushify EPG" \
  '{Type:"xmltv", Path:$path, ListingsId:"rushify", Name:$name, EnableAllTuners:true}')

echo "==> Adding XMLTV guide provider"
curl -sfS -X POST "${AUTH[@]}" -d "$GUIDE_JSON" "$JF_BASE/LiveTv/ListingProviders" || {
  echo "Guide provider add failed — may already exist. Continuing." >&2
}

echo "==> Refreshing Live TV (scheduled tasks)"
TASKS=$(curl -sfS -H "X-Emby-Token: $API_KEY" "$JF_BASE/ScheduledTasks")
for task_id in $(echo "$TASKS" | jq -r '.[] | .[]? | select(.Name|test("Refresh Guide|Refresh Channels|Scan Library";"i")) | .Id'); do
  curl -sfS -X POST -H "X-Emby-Token: $API_KEY" "$JF_BASE/ScheduledTasks/Running/$task_id" || true
done
sleep 30
COUNT=$(curl -sfS -H "X-Emby-Token: $API_KEY" \
  "$JF_BASE/LiveTv/Channels?StartIndex=0&Limit=1" | jq -r '.TotalRecordCount // 0')
echo "==> Jellyfin Live TV channels: $COUNT"

if [[ "$COUNT" -eq 0 ]]; then
  echo "WARNING: No channels in Jellyfin Live TV. Rushify will use direct provider fallback (IPTV_BACKEND=auto)." >&2
  exit 1
fi

echo "==> Jellyfin Live TV ready"
