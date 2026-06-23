#!/bin/bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:8096}"
COOKIES="/tmp/rushify-emergency-cookies.txt"
rm -f "$COOKIES"

echo "=== LOGIN ==="
curl -sS -c "$COOKIES" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | head -c 200
echo

echo "=== IPTV STATUS ==="
curl -sS -b "$COOKIES" "$BASE/api/iptv/status"
echo

echo "=== XTREAM player_api.php ==="
XTREAM_URL="${IPTV_XTREAM_URL:-http://justanothergod.com}"
XTREAM_USER="${IPTV_XTREAM_USERNAME:-RiveraStreams6}"
XTREAM_PASS="${IPTV_XTREAM_PASSWORD:-4ec6a25b8a}"
curl -sS -w "\nHTTP:%{http_code}\n" \
  "${XTREAM_URL}/player_api.php?username=${XTREAM_USER}&password=${XTREAM_PASS}" | head -c 600
echo

echo "=== ENGLISH CHANNELS (first 5 names) ==="
CHANNELS_JSON=$(curl -sS -b "$COOKIES" "${BASE}/api/iptv/channels?limit=500&englishOnly=true")
echo "$CHANNELS_JSON" | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
const chs=d.data?.channels??[];
console.log('count='+chs.length);
chs.slice(0,5).forEach(c=>console.log(c.id, c.name, '|', c.group));
"

CHANNEL_ID=$(echo "$CHANNELS_JSON" | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
const chs=d.data?.channels??[];
const pick=(list)=>list.find(c=>{
  const n=c.name||'';
  if(n.includes('PPV')||n.includes('####')) return false;
  return /CNN|BBC|ESPN|FOX NEWS|NBC|ABC|SKY NEWS/i.test(n);
})||list.find(c=>!(c.name||'').includes('PPV')&&!(c.name||'').includes('####'));
const c=pick(chs);
if(c) console.log(c.id);
")

echo "=== TEST CHANNEL: ${CHANNEL_ID:-none} ==="

if [[ -n "${CHANNEL_ID:-}" ]]; then
  echo "=== M3U8 via proxy ==="
  M3U8=$(curl -sS -b "$COOKIES" -w "\n__HTTP__:%{http_code}" \
    "${BASE}/api/stream/iptv/${CHANNEL_ID}")
  STATUS="${M3U8##*__HTTP__:}"
  BODY="${M3U8%__HTTP__:*}"
  echo "HTTP $STATUS"
  echo "$BODY" | head -15

  if [[ "$STATUS" == "200" && "$BODY" == *"#EXTM3U"* ]]; then
    SEG=$(echo "$BODY" | grep -v '^#' | grep -v '^$' | head -1 | tr -d '\r')
    echo "=== FIRST SEGMENT/PLAYLIST LINE: $SEG ==="
    if [[ "$SEG" == http* ]]; then
      echo "=== DIRECT CDN SEGMENT ==="
      curl -sS -o /dev/null -w "HTTP:%{http_code} size:%{size_download}\n" \
        -H "User-Agent: Mozilla/5.0" -r 0-65535 "$SEG" || true
    elif [[ -n "$SEG" ]]; then
      echo "=== PROXIED ASSET ==="
      curl -sS -b "$COOKIES" -o /dev/null -w "HTTP:%{http_code} size:%{size_download}\n" \
        "${BASE}${SEG}" || true
    fi
  fi

  echo "=== TS FALLBACK ==="
  curl -sS -b "$COOKIES" -o /dev/null -w "HTTP:%{http_code} ct:%{content_type}\n" \
    "${BASE}/api/stream/iptv/${CHANNEL_ID}?format=ts" || true
fi

echo "=== DONE ==="
