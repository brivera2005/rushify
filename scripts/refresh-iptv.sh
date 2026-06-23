#!/bin/bash
COOKIES=/tmp/rushify-refresh-cookies.txt
BASE=http://127.0.0.1:8096
curl -sS -c "$COOKIES" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' > /dev/null
curl -sS -b "$COOKIES" -X POST "$BASE/api/iptv/refresh" \
  -H "Content-Type: application/json" \
  -d '{"type":"all"}'
