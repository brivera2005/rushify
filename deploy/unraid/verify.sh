#!/bin/bash
set -euo pipefail

BASE="http://127.0.0.1:8096"

echo "=== Health ==="
curl -s -o /dev/null -w "health: %{http_code}\n" "$BASE/api/health"

echo "=== Admin login ==="
curl -s -c /tmp/rushify-admin.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
echo ""

echo "=== Admin /me ==="
curl -s -b /tmp/rushify-admin.txt "$BASE/api/auth/me"
echo ""

echo "=== IPTV status ==="
curl -s -b /tmp/rushify-admin.txt "$BASE/api/iptv/status" | head -c 350
echo ""

echo "=== Benjamin login ==="
curl -s -c /tmp/rushify-ben.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"benjamin","password":"rushify2024"}'
echo ""

echo "=== Benjamin /me ==="
curl -s -b /tmp/rushify-ben.txt "$BASE/api/auth/me"
echo ""

echo "=== Settings (benjamin) ==="
curl -s -o /dev/null -w "status: %{http_code} redirect: %{redirect_url}\n" -b /tmp/rushify-ben.txt "$BASE/settings"

echo "=== Jellyfin ==="
curl -s -b /tmp/rushify-admin.txt "$BASE/api/jellyfin/status"
echo ""

echo "=== Live (no auth) ==="
curl -s -o /dev/null -w "live: %{http_code}\n" "$BASE/live"

echo "=== Live (admin auth) ==="
curl -s -o /dev/null -w "live: %{http_code}\n" -b /tmp/rushify-admin.txt "$BASE/live"
