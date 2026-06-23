# Synology NAS — The Maze Commit Bot

Automated scavenger-hunt hint commits for the rushify repo: **5–20 cryptic fragments per day**, building a long 80s/90s early-internet ARG trail in `the-maze/`.

## What it does

- Plans a random number of commits each day (default **5–20**)
- Spreads commit times across the rest of the day (minimum ~20 minutes apart)
- Writes markdown fragments to `the-maze/fragments/`
- Updates `the-maze/manifest.json` (fragment index)
- Git-commits each drop with maze-themed messages
- Optionally pushes to a remote (SSH deploy key recommended)

Bot code lives in `commit-bot/`. Hint output lives in `the-maze/`.

## Option A — Docker on Synology (recommended)

### 1. Clone the repo on your NAS

```bash
cd /volume1/docker
git clone <your-rushify-repo-url> rushify
cd rushify/commit-bot
cp .env.example .env
```

Edit `.env`:

| Variable | Example | Notes |
| --- | --- | --- |
| `REPO_HOST_PATH` | `/volume1/docker/rushify` | Host path for docker-compose volume |
| `TZ` | `America/New_York` | Scheduling timezone |
| `COMMITS_MIN` / `COMMITS_MAX` | `5` / `20` | Daily commit range |
| `GIT_AUTHOR_NAME` | `The Maze` | Commit author |
| `GIT_REMOTE` | `origin` | Leave empty for local-only commits |
| `GIT_BRANCH` | `main` | Push target |

### 2. Git push access (optional)

For pushes from the container:

1. Generate a deploy key on the NAS (read/write to this repo only)
2. Add the public key to GitHub/GitLab deploy keys
3. Mount the private key in `commit-bot/docker-compose.yml`:

```yaml
volumes:
  - /volume1/docker/rushify:/repo
  - ./data:/bot/data
  - /volume1/docker/rushify/.ssh/maze_deploy:/root/.ssh/id_ed25519:ro
```

Ensure `known_hosts` includes your git host, or set in the container:

```bash
ssh-keyscan github.com >> /volume1/docker/rushify/.ssh/known_hosts
```

### 3. Build and run

**Synology Container Manager:** Import `commit-bot/docker-compose.yml`, set project path to `commit-bot/`, start the stack.

**SSH:**

```bash
cd /volume1/docker/rushify/commit-bot
docker compose up -d --build
docker compose logs -f maze-commit-bot
```

State persists in `commit-bot/data/state.json` (schedule, maze path, fragment counter).

### 4. Verify

```bash
docker compose exec maze-commit-bot node src/schedule.mjs --print
docker compose exec maze-commit-bot node src/drop.mjs   # manual test drop
```

## Option B — Synology Task Scheduler (no Docker)

If you prefer DSM cron over a long-running container:

1. Install Node.js 18+ via Package Center or `nvm`
2. Clone repo and configure `commit-bot/.env`
3. Import **`deploy/synology/maze-bot-task.xml`** or create a scheduled task:
   - **Run every 5 minutes**
   - User: account that owns the git repo
   - Script: `/volume1/docker/rushify/deploy/synology/run-maze-tick.sh`

The tick script invokes the same scheduler logic as the Docker daemon (one commit when a slot is due).

Daily schedule is still generated inside `commit-bot/data/state.json` — first tick after midnight plans 5–20 slots.

## Option C — Manual / dev testing

From the repo root:

```bash
cd commit-bot
cp .env.example .env
# REPO_PATH=.. is correct when running from commit-bot/

# Dry run (no git commits)
DRY_RUN=1 node src/drop.mjs

# Plan today
node src/schedule.mjs --print

# Single real commit
node src/drop.mjs

# Daemon (local)
node src/index.mjs
```

## Daily schedule behavior

| Setting | Default | Behavior |
| --- | --- | --- |
| `COMMITS_MIN` | 5 | Minimum hints per calendar day |
| `COMMITS_MAX` | 20 | Maximum hints per calendar day |
| `TICK_MS` | 60000 | Daemon checks every 60s for due slots |
| `TZ` | UTC | Day boundary + time spread |

Each day at the first tick after midnight (in `TZ`):

1. Random count `N` where `COMMITS_MIN ≤ N ≤ COMMITS_MAX`
2. `N` timestamps from “now” through 23:59, at least ~20 minutes apart
3. Each due slot triggers one fragment + git commit

If the bot was offline, missed slots fire on the next tick (catch-up).

## Hint narrative

- **Maze graph:** 15 nodes (gate, modem-well, catacomb-7, root-node, red herrings, …)
- **Fragment types:** BBS logs, ciphers (ROT13/Vigenère/Caesar/hex), coordinates, phone traces, memories, ASCII sigils
- **Progression:** `state.json` tracks `currentNode`, `pathTaken`, `fragmentIndex`, `dayNumber`
- **Master shards:** 20 narrative pieces cycle and combine into the long-term clue

Players read `the-maze/README.md` and follow `the-maze/manifest.json` + fragments by `sequence`.

## Files

```text
commit-bot/           Bot source, Docker, state
the-maze/             Committed hint output (safe to publish)
deploy/synology/      DSM task helper scripts
```

## Security

- Do **not** commit `.env` or SSH private keys
- Use a deploy key limited to this repository
- `DRY_RUN=1` for testing without git writes
