#!/bin/bash
set -euo pipefail
BASE="${1:-http://localhost:8096}"
COOKIES="/tmp/rushify-verify-cookies.txt"
rm -f "$COOKIES"

check() {
  local name="$1" method="$2" path="$3" data="${4:-}"
  local start end elapsed status body
  start=$(date +%s.%N)
  if [[ "$method" == "POST" && -n "$data" ]]; then
    body=$(curl -sS -b "$COOKIES" -c "$COOKIES" -X POST "$BASE$path" \
      -H "Content-Type: application/json" -d "$data" -w "\n__HTTP__:%{http_code}")
  else
    body=$(curl -sS -b "$COOKIES" -c "$COOKIES" "$BASE$path" -w "\n__HTTP__:%{http_code}")
  fi
  end=$(date +%s.%N)
  elapsed=$(awk "BEGIN {print $end - $start}")
  status="${body##*__HTTP__:}"
  body="${body%__HTTP__:*}"
  preview=$(echo "$body" | tr '\n' ' ' | head -c 200)
  if [[ "$status" -lt 400 ]]; then
    echo "OK   $name: HTTP $status in ${elapsed}s — $preview"
  else
    echo "FAIL $name: HTTP $status in ${elapsed}s — $preview"
    return 1
  fi
}

check health GET /api/health || true
check login POST /api/auth/login '{"username":"admin","password":"admin"}' || true
check jellyfin GET /api/jellyfin/status || true
check iptv GET /api/iptv/status || true
check channels GET '/api/iptv/channels?limit=5' || true
check library GET '/api/library/items?limit=3' || true
check prefs GET /api/user/prefs || true
