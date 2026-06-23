#!/bin/sh
set -e
JF=http://127.0.0.1:8096

printf '%s' '{"Name":"admin","Password":"admin123","PasswordConfirm":"admin123"}' > /tmp/jf-user.json

echo "=== Startup Info ==="
curl -s "$JF/Startup/Info" || true
echo

echo "=== Create admin user ==="
curl -s -X POST "$JF/Startup/User" -H "Content-Type: application/json" --data-binary @/tmp/jf-user.json
echo

echo "=== Authenticate ==="
printf '%s' '{"Username":"admin","Pw":"admin123"}' > /tmp/jf-auth.json
AUTH=$(curl -s -X POST "$JF/Users/authenticatebyname" \
  -H "Content-Type: application/json" \
  -H 'X-Emby-Authorization: MediaBrowser Client="RushifySetup", Device="Setup", DeviceId="rushify-setup", Version="1.0.0"' \
  --data-binary @/tmp/jf-auth.json)
echo "$AUTH" | head -c 200
echo

TOKEN=$(echo "$AUTH" | sed -n 's/.*"AccessToken":"\([^"]*\)".*/\1/p')
USER_ID=$(echo "$AUTH" | sed -n 's/.*"Id":"\([^"]*\)".*/\1/p')
echo "Token: ${TOKEN:0:20}... User: $USER_ID"

if [ -n "$TOKEN" ]; then
  echo "=== Add movie library ==="
  printf '%s' '{"Name":"Movies","CollectionType":"movies","Paths":["/data/movies"],"LibraryOptions":{"EnablePhotos":false}}' > /tmp/jf-lib-movies.json
  curl -s -X POST "$JF/Library/VirtualFolders/Name/Movies" \
    -H "Content-Type: application/json" \
    -H "X-Emby-Token: $TOKEN" \
    --data-binary @/tmp/jf-lib-movies.json
  echo

  echo "=== Add TV library ==="
  printf '%s' '{"Name":"TV Shows","CollectionType":"tvshows","Paths":["/data/tv"],"LibraryOptions":{"EnablePhotos":false}}' > /tmp/jf-lib-tv.json
  curl -s -X POST "$JF/Library/VirtualFolders/Name/TV%20Shows" \
    -H "Content-Type: application/json" \
    -H "X-Emby-Token: $TOKEN" \
    --data-binary @/tmp/jf-lib-tv.json
  echo

  echo "=== Create API key ==="
  API=$(curl -s -X POST "$JF/Auth/Keys?app=Rushify" -H "X-Emby-Token: $TOKEN")
  echo "$API"
  API_KEY=$(echo "$API" | sed -n 's/.*"AccessToken":"\([^"]*\)".*/\1/p')
  echo "API_KEY=$API_KEY"
fi

echo "=== Public info ==="
curl -s "$JF/System/Info/Public"
echo
