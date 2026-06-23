#!/bin/sh
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' \
  -D - -o /tmp/out.json
echo
cat /tmp/out.json
