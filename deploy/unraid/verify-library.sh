#!/bin/bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:8096}"
JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

curl -s -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' >/dev/null

echo "=== Post-deploy checks ($BASE) ==="

MOVIES=$(curl -s -b "$JAR" "$BASE/api/library/items?section=movies&limit=48&startIndex=0")
node -e "
const j=JSON.parse(process.argv[1]);
console.log('Movies page:', j.items?.length, 'of', j.totalCount);
" "$MOVIES"

SEARCH=$(curl -s -b "$JAR" -X POST "$BASE/api/search/ask" \
  -H "Content-Type: application/json" \
  -d '{"query":"comedy","section":"movies"}')
node -e "
const j=JSON.parse(process.argv[1]);
console.log('Search fallback:', j.mode, 'results:', j.items?.length ?? 0);
" "$SEARCH"

GENRES=$(curl -s -b "$JAR" "$BASE/api/library/genres?section=movies")
node -e "
const j=JSON.parse(process.argv[1]);
console.log('Genres:', j.genres?.length ?? 0);
" "$GENRES"

echo "Done."
