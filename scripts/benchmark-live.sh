#!/bin/bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:8096}"
COOKIES="/tmp/rushify-bench-cookies.txt"
rm -f "$COOKIES"

bench() {
  local name="$1" path="$2"
  local start end elapsed status
  start=$(date +%s.%N)
  status=$(curl -sS -b "$COOKIES" -o /tmp/rushify-bench-body.txt -w "%{http_code}" "$BASE$path")
  end=$(date +%s.%N)
  elapsed=$(awk "BEGIN {printf \"%.3f\", $end - $start}")
  size=$(wc -c < /tmp/rushify-bench-body.txt | tr -d ' ')
  cache=$(curl -sS -I -b "$COOKIES" "$BASE$path" 2>/dev/null | grep -i "x-cache-status" | tr -d '\r' || true)
  echo "$name: ${elapsed}s HTTP $status size=${size}b ${cache:-}"
}

echo "=== Login ==="
curl -sS -c "$COOKIES" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"benjamin","password":"rushify2024"}' > /dev/null

echo "=== Page/API benchmarks ==="
bench "guide" "/live/guide"
bench "channels" "/api/iptv/channels"
bench "epg" "/api/iptv/epg"
bench "iptv_status" "/api/iptv/status"

echo "=== Xtream cred check ==="
curl -sS "http://justanothergod.com/player_api.php?username=RiveraStreams6&password=4ec6a25b8a" | head -c 300
echo ""

curl -sS -b "$COOKIES" "$BASE/api/iptv/channels" -o /tmp/rushify-channels.json
curl -sS -b "$COOKIES" "$BASE/api/iptv/epg" -o /tmp/rushify-epg.json
node -e "
const c=require('/tmp/rushify-channels.json');
const e=require('/tmp/rushify-epg.json');
console.log('channels:', c.data.channels.length, 'cache:', c.meta.cacheStatus);
console.log('programmes:', e.data.programmes.length, 'total:', e.meta.totalProgrammes, 'cache:', e.meta.cacheStatus);
"

echo "=== Stream test (first 5 channels) ==="
PLAY_OK=0
while IFS= read -r CHANNEL_ID; do
  [[ -z "$CHANNEL_ID" ]] && continue
  echo "--- Channel: $CHANNEL_ID ---"
  MANIFEST_CODE=$(curl -sS -b "$COOKIES" -o /tmp/rushify-manifest.m3u8 -w "%{http_code}:%{time_total}" \
    "$BASE/api/stream/iptv/${CHANNEL_ID}")
  echo "manifest: HTTP ${MANIFEST_CODE%:*} ${MANIFEST_CODE#*:}s"
  if [[ "${MANIFEST_CODE%:*}" != "200" ]]; then
    head -3 /tmp/rushify-manifest.m3u8 2>/dev/null || true
    continue
  fi

  SEG=$(grep -v '^#' /tmp/rushify-manifest.m3u8 | head -1 | tr -d '\r')
  if [[ -z "$SEG" ]]; then
    echo "no segment in manifest"
    continue
  fi

  if [[ "$SEG" == http* ]]; then
    DIRECT="$SEG"
    ENC=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$SEG")
    PROXY="$BASE/api/stream/iptv/${CHANNEL_ID}/asset?path=$ENC"
  else
    PROXY="$BASE$SEG"
    DIRECT=""
  fi

  SEG_RESULT="fail"
  if [[ -n "$DIRECT" ]]; then
    DIRECT_RESULT=$(curl -sS -o /dev/null -w "%{http_code}:%{time_total}" "$DIRECT" 2>/dev/null || echo "000:0")
    echo "direct_segment: HTTP ${DIRECT_RESULT%:*} ${DIRECT_RESULT#*:}s"
    if [[ "${DIRECT_RESULT%:*}" == "200" || "${DIRECT_RESULT%:*}" == "206" ]]; then
      SEG_RESULT="ok"
    fi
  fi

  if [[ "$SEG_RESULT" != "ok" ]]; then
    PROXY_RESULT=$(curl -sS -b "$COOKIES" -o /dev/null -w "%{http_code}:%{time_total}" "$PROXY" 2>/dev/null || echo "000:0")
    echo "proxy_segment: HTTP ${PROXY_RESULT%:*} ${PROXY_RESULT#*:}s"
    if [[ "${PROXY_RESULT%:*}" == "200" || "${PROXY_RESULT%:*}" == "206" ]]; then
      SEG_RESULT="ok"
    fi
  fi

  if [[ "$SEG_RESULT" == "ok" ]]; then
    PLAY_OK=$((PLAY_OK + 1))
  fi
done < <(node -e "
const chs=require('/tmp/rushify-channels.json').data.channels;
chs.slice(0,5).forEach(c=>console.log(c.id));
")

echo "=== PLAY_OK: $PLAY_OK / 5 ==="
