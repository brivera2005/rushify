#!/bin/sh
# Synology Task Scheduler — run every 5 minutes.
# One commit max per run when a schedule slot is due.

set -eu

BOT_DIR="${MAZE_BOT_DIR:-/volume1/docker/rushify/commit-bot}"
NODE="${MAZE_NODE:-node}"

cd "$BOT_DIR"
exec "$NODE" src/tick-once.mjs
