#!/bin/bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:8096}"
JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

curl -s -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' >/dev/null

LIB=$(curl -s -b "$JAR" "$BASE/api/library/items?section=recent-movies")
node -e "
const j=JSON.parse(process.argv[1]);
const it=j.items?.[0];
console.log('items', j.items?.length, 'tag', it?.imageTag, 'id', it?.id);
" "$LIB"

ID=$(node -pe "JSON.parse(process.argv[1]).items?.[0]?.id" "$LIB")
TAG=$(node -pe "JSON.parse(process.argv[1]).items?.[0]?.imageTag" "$LIB")

if [[ -n "$ID" && -n "$TAG" ]]; then
  curl -s -o /dev/null -w "image: HTTP %{http_code} size %{size_download}\n" -b "$JAR" \
    "$BASE/api/jellyfin/Items/${ID}/Images/Primary?tag=${TAG}&fillWidth=200&quality=92"
else
  echo "No image tag on first item"
fi

time curl -s -b "$JAR" -o /dev/null -w "epg: HTTP %{http_code} size %{size_download} time %{time_total}s\n" \
  "$BASE/api/iptv/epg"
