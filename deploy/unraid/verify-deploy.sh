#!/bin/bash
# Full deploy verification for Rushify on unRAID
set -euo pipefail

BASE="${1:-http://127.0.0.1:8096}"
JAR=$(mktemp)
PASS=0
FAIL=0

check() {
  local name="$1"
  local ok="$2"
  if [ "$ok" = "1" ]; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Rushify deploy verification ($BASE) ==="

# Auth
login=$(curl -s -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')
login_ok=$(printf '%s' "$login" | node -pe "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); (j.ok === true || j.user?.username) ? '1' : '0'" 2>/dev/null || echo 0)
check "Login" "$login_ok"

# Health
health_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/health")
[ "$health_code" = "200" ] && check "Health endpoint" 1 || check "Health endpoint" 0

# English filter (~16k channels)
channels=$(curl -s -b "$JAR" --max-time 120 "$BASE/api/iptv/channels")
english_count=$(printf '%s' "$channels" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data?.channels?.length ?? 0")
english_only=$(printf '%s' "$channels" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).meta?.englishOnly === true ? '1' : '0'")
[ "$english_only" = "1" ] && check "English-only filter enabled" 1 || check "English-only filter enabled" 0
[ "$english_count" -gt 10000 ] 2>/dev/null && [ "$english_count" -lt 25000 ] 2>/dev/null && check "English channel count ~16k ($english_count)" 1 || check "English channel count ~16k (got $english_count)" 0

# EPG
epg=$(curl -s -b "$JAR" --max-time 120 "$BASE/api/iptv/epg")
prog_count=$(printf '%s' "$epg" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data?.programmes?.length ?? 0")
[ "$prog_count" -gt 1000 ] 2>/dev/null && check "EPG programmes loaded ($prog_count)" 1 || check "EPG programmes loaded (got $prog_count)" 0

# Cast token — live
first_channel=$(printf '%s' "$channels" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data?.channels?.[0]?.id ?? ''")
if [ -n "$first_channel" ]; then
  cast_live=$(curl -s -b "$JAR" -X POST "$BASE/api/cast/token" \
    -H "Content-Type: application/json" \
    -d "{\"kind\":\"iptv\",\"id\":\"$first_channel\"}")
  cast_live_ok=$(printf '%s' "$cast_live" | node -pe "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); j.streamUrl && j.contentType ? '1' : '0'" 2>/dev/null || echo 0)
  check "Cast token (live IPTV)" "$cast_live_ok"

  cast_stream=$(printf '%s' "$cast_live" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).streamUrl" 2>/dev/null || echo "")
  if [ -n "$cast_stream" ]; then
    cast_m3u_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$cast_stream")
    [ "$cast_m3u_code" = "200" ] && check "Cast stream manifest (live)" 1 || check "Cast stream manifest (live) HTTP $cast_m3u_code" 0
  fi
else
  check "Cast token (live IPTV) — no channels" 0
fi

# Cast token — VOD (if Jellyfin configured)
library=$(curl -s -b "$JAR" "$BASE/api/library/items?section=recent-movies")
vod_id=$(printf '%s' "$library" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).items?.[0]?.id ?? ''" 2>/dev/null || echo "")
if [ -n "$vod_id" ]; then
  cast_vod=$(curl -s -b "$JAR" -X POST "$BASE/api/cast/token" \
    -H "Content-Type: application/json" \
    -d "{\"kind\":\"vod\",\"id\":\"$vod_id\"}")
  cast_vod_ok=$(printf '%s' "$cast_vod" | node -pe "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); j.streamUrl ? '1' : '0'" 2>/dev/null || echo 0)
  check "Cast token (VOD)" "$cast_vod_ok"
else
  echo "SKIP: Cast token (VOD) — no Jellyfin movies"
fi

# Pages
for path in /live/guide /live/channels /movies /; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE$path")
  [ "$code" = "200" ] && check "Page $path" 1 || check "Page $path HTTP $code" 0
done

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
trap 'rm -f "$JAR"' EXIT
[ "$FAIL" -eq 0 ]
