#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://192.168.0.19:8096}"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
APP_DIR="/mnt/user/appdata/rushify"

echo "=== Rushify IPTV stream benchmark ==="
echo "Base: $BASE"
curl -s -o /dev/null -w "health: %{http_code} in %{time_total}s\n" "$BASE/api/health"

set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env" 2>/dev/null || true
set +a

readarray -t CREDS < <(node -e "
const fs=require('fs');
const env=fs.readFileSync('$APP_DIR/.env','utf8');
const m=env.match(/RUSHIFY_USERS=(\\[.+\\])/);
let user='admin', pass='admin';
if(m){try{const u=JSON.parse(m[1]); if(u[0]){user=u[0].username; pass=u[0].password;}}catch{}}
else {
  const u=env.match(/RUSHIFY_ADMIN_USERNAME=(.+)/)?.[1]?.trim();
  const p=env.match(/RUSHIFY_ADMIN_PASSWORD=(.+)/)?.[1]?.trim();
  if(u) user=u; if(p) pass=p;
}
console.log(user); console.log(pass);
")
USER="${CREDS[0]}"
PASS="${CREDS[1]}"

COOKIE=$(curl -s -c - -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" | grep rushify_session | awk '{print $NF}')

echo "Logged in as $USER"

CHANNELS_JSON=$(curl -s -b "rushify_session=$COOKIE" "$BASE/api/iptv/channels")
echo "$CHANNELS_JSON" > /tmp/rushify-channels-raw.json
node -e "
const d=JSON.parse(require('fs').readFileSync('/tmp/rushify-channels-raw.json','utf8'));
let ch=(d.data?.channels||[]).filter(c=>/BBC|CNN|Sky|ITV|ABC|NBC|FOX|News/i.test(c.name));
if(ch.length<3) ch=(d.data?.channels||[]).slice(0,3);
else ch=ch.slice(0,3);
require('fs').writeFileSync('/tmp/rushify-bench-channels.json', JSON.stringify(ch.map(c=>({id:c.id,name:c.name,url:c.streamUrl}))));
console.log('Selected', ch.length, 'channels');
"

time_segment() {
  local label=$1 url=$2
  curl -s -o /dev/null -w "${label}: %{time_total}s status=%{http_code} bytes=%{size_download}\n" \
    -H "User-Agent: $UA" \
    ${COOKIE:+-b "rushify_session=$COOKIE"} \
    "$url"
}

node -e "JSON.parse(require('fs').readFileSync('/tmp/rushify-bench-channels.json','utf8')).forEach(c=>console.log(JSON.stringify(c)))" | while read -r row; do
  ID=$(echo "$row" | node -e "console.log(JSON.parse(require('fs').readAllSync(0,'utf8')).id)")
  NAME=$(echo "$row" | node -e "console.log(JSON.parse(require('fs').readAllSync(0,'utf8')).name)")
  URL=$(echo "$row" | node -e "console.log(JSON.parse(require('fs').readAllSync(0,'utf8')).url)")

  echo ""
  echo "=== $NAME ==="
  MANIFEST=$(curl -s -b "rushify_session=$COOKIE" -H "User-Agent: $UA" "$BASE$URL")
  SEG=$(echo "$MANIFEST" | grep -v '^#' | head -1)
  echo "  Segment: ${SEG:0:100}..."

  if [[ "$SEG" == http* ]]; then
    echo "  Manifest rewrite: DIRECT CDN (hybrid mode)"
    time_segment "  direct CDN  " "$SEG"
    ENCODED=$(node -pe "encodeURIComponent('$SEG')")
    time_segment "  via proxy   " "$BASE/api/stream/iptv/$(node -pe "encodeURIComponent('$ID')")/asset?path=$ENCODED"
  else
    echo "  Manifest rewrite: FULL PROXY"
    time_segment "  via proxy   " "$BASE$SEG"
    DIRECT=$(node -pe "decodeURIComponent(new URL('$BASE$SEG').searchParams.get('path')||'')")
    if [[ -n "$DIRECT" ]]; then
      time_segment "  direct CDN  " "$DIRECT"
    fi
  fi

  echo "  --- 3-segment average ---"
  for i in 1 2 3; do
    MANIFEST=$(curl -s -b "rushify_session=$COOKIE" -H "User-Agent: $UA" "$BASE$URL")
    SEG=$(echo "$MANIFEST" | grep -v '^#' | head -1)
    if [[ "$SEG" == http* ]]; then
      time_segment "  sample $i    " "$SEG"
    else
      time_segment "  sample $i    " "$BASE$SEG"
    fi
  done
done

echo ""
echo "Done."
