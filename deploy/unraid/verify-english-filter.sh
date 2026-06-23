#!/bin/bash
# Quick check: total vs English-filtered channel counts
set -euo pipefail

BASE="${1:-http://127.0.0.1:8096}"
JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

curl -s -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' >/dev/null

total=$(curl -s -b "$JAR" --max-time 300 "$BASE/api/iptv/channels?englishOnly=false")
english=$(curl -s -b "$JAR" --max-time 300 "$BASE/api/iptv/channels?englishOnly=true")

node <<NODE
const total = $total;
const english = $english;
console.log("totalChannels:", total.meta?.totalChannels ?? total.data?.channels?.length ?? total.error);
console.log("englishChannels:", english.meta?.filteredChannels ?? english.data?.channels?.length ?? english.error);
console.log("englishOnly:", english.meta?.englishOnly);
NODE
