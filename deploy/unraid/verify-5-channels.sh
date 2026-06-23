#!/bin/bash
# Verify 5 English live channels play end-to-end
set -euo pipefail
BASE="${1:-http://127.0.0.1:8096}"
COOKIES="/tmp/rushify-5ch-cookies.txt"
rm -f "$COOKIES"

curl -sS -c "$COOKIES" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' > /dev/null

NAMES=("CNN" "ESPN" "FOX NEWS" "NBC" "ABC")
PASS=0
FAIL=0

for NAME in "${NAMES[@]}"; do
  CID=$(curl -sS -b "$COOKIES" "${BASE}/api/iptv/channels?limit=2000" | node -e "
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const ch=d.data?.channels?.find(c=>c.name.toUpperCase().includes('${NAME}')&&!c.name.includes('####'));
    if(ch) console.log(ch.id+'|'+ch.name);
  " 2>/dev/null || echo "")

  if [[ -z "$CID" ]]; then
    echo "SKIP $NAME — not found in lineup"
    continue
  fi

  ID="${CID%%|*}"
  LABEL="${CID#*|}"

  M3U8=$(curl -sS -b "$COOKIES" -w "\n__HTTP__:%{http_code}" \
    --max-time 15 "${BASE}/api/stream/iptv/${ID}" 2>/dev/null || echo "__HTTP__:000")
  STATUS="${M3U8##*__HTTP__:}"
  BODY="${M3U8%__HTTP__:*}"

  if [[ "$STATUS" != "200" || "$BODY" != *"#EXTM3U"* ]]; then
    echo "FAIL $LABEL — manifest HTTP $STATUS"
    FAIL=$((FAIL + 1))
    continue
  fi

  SEG=$(echo "$BODY" | grep -v '^#' | grep -v '^$' | head -1 | tr -d '\r')
  if [[ -z "$SEG" ]]; then
    echo "FAIL $LABEL — empty manifest"
    FAIL=$((FAIL + 1))
    continue
  fi

  if [[ "$SEG" == http* ]]; then
    SEG_URL="$SEG"
  else
    SEG_URL="${BASE}${SEG}"
  fi

  SEG_CODE=$(curl -sS -b "$COOKIES" -o /dev/null -w "%{http_code}" \
    --max-time 10 -r 0-131071 -H "User-Agent: Mozilla/5.0" "$SEG_URL" 2>/dev/null || echo "000")

  if [[ "$SEG_CODE" == "200" || "$SEG_CODE" == "206" ]]; then
    echo "OK   $LABEL ($ID) — manifest $STATUS, segment $SEG_CODE"
    PASS=$((PASS + 1))
  else
    echo "FAIL $LABEL — segment HTTP $SEG_CODE"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=== $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]]
