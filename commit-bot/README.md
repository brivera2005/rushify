# The Maze Commit Bot

Automated ARG scavenger-hunt commits for `the-maze/` — 5–20 cryptic fragments per day.

## Quick start

```bash
cd commit-bot
cp .env.example .env
DRY_RUN=1 node src/drop.mjs          # test without git
node src/schedule.mjs --print        # today's plan
node src/index.mjs                   # daemon
node src/tick-once.mjs               # cron-friendly single tick
```

## Synology NAS

See **[deploy/synology/README-SYNOLOGY-MAZE-BOT.md](../deploy/synology/README-SYNOLOGY-MAZE-BOT.md)** for Docker and Task Scheduler setup.

## Layout

| Path | Purpose |
| --- | --- |
| `src/` | Bot logic (schedule, narrative, git) |
| `data/` | Persistent state (not committed) |
| `../the-maze/` | Hint output committed to git |
