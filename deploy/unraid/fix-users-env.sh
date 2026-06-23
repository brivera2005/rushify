#!/bin/bash
# Ensures RUSHIFY_USERS JSON is valid in .env (run before deploy)
set -euo pipefail

ENV_FILE="/mnt/user/appdata/rushify/.env"
USERS='[{"username":"admin","password":"admin","role":"admin"},{"username":"benjamin","password":"rushify2024","role":"user"}]'

if grep -q '"username"' "$ENV_FILE" 2>/dev/null; then
  echo "RUSHIFY_USERS already valid."
  exit 0
fi

sed -i '/^RUSHIFY_USERS=/d' "$ENV_FILE"
echo "RUSHIFY_USERS=${USERS}" >> "$ENV_FILE"
echo "Fixed RUSHIFY_USERS in .env"
