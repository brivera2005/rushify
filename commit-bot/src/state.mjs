import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

const DEFAULT_STATE = {
  version: 1,
  startedAt: null,
  dayNumber: 0,
  fragmentIndex: 0,
  currentNode: "gate",
  pathTaken: ["gate"],
  masterSeed: null,
  stats: { totalCommits: 0, totalDays: 0 },
  today: {
    date: null,
    plannedCount: 0,
    times: [],
    completed: [],
  },
};

export function loadConfig(env = process.env) {
  const repoPath = env.REPO_PATH ?? "..";
  const stateDir = env.STATE_DIR ?? "./data";
  const hintDir = env.HINT_DIR ?? "the-maze";
  const commitsMin = clampInt(env.COMMITS_MIN, 5, 1, 50);
  const commitsMax = clampInt(env.COMMITS_MAX, 20, commitsMin, 50);
  const tickMs = clampInt(env.TICK_MS, 60_000, 10_000, 600_000);
  const dryRun = env.DRY_RUN === "1" || env.DRY_RUN === "true";
  const tz = env.TZ ?? "UTC";

  return {
    repoPath,
    stateDir,
    statePath: join(stateDir, "state.json"),
    hintDir,
    fragmentsDir: join(repoPath, hintDir, "fragments"),
    manifestPath: join(repoPath, hintDir, "manifest.json"),
    commitsMin,
    commitsMax,
    tickMs,
    dryRun,
    tz,
    gitAuthorName: env.GIT_AUTHOR_NAME ?? "The Maze",
    gitAuthorEmail: env.GIT_AUTHOR_EMAIL ?? "maze@localhost",
    gitRemote: env.GIT_REMOTE?.trim() || null,
    gitBranch: env.GIT_BRANCH?.trim() || "main",
  };
}

function clampInt(raw, fallback, min, max) {
  const n = Number.parseInt(String(raw ?? fallback), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function loadState(config) {
  mkdirSync(dirname(config.statePath), { recursive: true });
  if (!existsSync(config.statePath)) {
    const seed = randomBytes(16).toString("hex");
    const state = {
      ...DEFAULT_STATE,
      startedAt: new Date().toISOString(),
      masterSeed: seed,
      dayNumber: 1,
    };
    saveState(config, state);
    return state;
  }
  const raw = readFileSync(config.statePath, "utf8");
  return { ...DEFAULT_STATE, ...JSON.parse(raw) };
}

export function saveState(config, state) {
  mkdirSync(dirname(config.statePath), { recursive: true });
  writeFileSync(config.statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function ensureTodaySchedule(state, config, now = new Date()) {
  const date = todayKey(now);
  if (state.today?.date === date && state.today.times?.length > 0) {
    return state;
  }

  const previousDate = state.today?.date;
  const count = randomInt(config.commitsMin, config.commitsMax);
  const times = generateDayTimes(count, now);

  if (previousDate && previousDate !== date) {
    state.dayNumber += 1;
    state.stats.totalDays = (state.stats.totalDays ?? 0) + 1;
  }

  state.today = {
    date,
    plannedCount: count,
    times,
    completed: [],
  };

  return state;
}

/** Spread `count` commit times across remaining hours today (or full day if early). */
export function generateDayTimes(count, now = new Date()) {
  const start = new Date(now);
  start.setSeconds(0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 0, 0);

  const minGapMs = 20 * 60 * 1000;
  const windowStart = start.getTime() + 2 * 60 * 1000;
  const windowEnd = end.getTime();

  if (windowEnd - windowStart < minGapMs * count) {
    const slots = [];
    for (let i = 0; i < count; i++) {
      const t = new Date(windowStart + i * minGapMs);
      if (t.getTime() <= windowEnd) slots.push(t.toISOString());
    }
    return slots.slice(0, count);
  }

  const slots = [];
  let cursor = windowStart + Math.floor(Math.random() * minGapMs);

  for (let i = 0; i < count; i++) {
    const remaining = count - i;
    const spaceLeft = windowEnd - cursor;
    const maxStep = Math.floor(spaceLeft / remaining) - minGapMs;
    const step = minGapMs + Math.floor(Math.random() * Math.max(minGapMs, maxStep));
    cursor = Math.min(windowEnd, cursor + step);
    slots.push(new Date(cursor).toISOString());
    cursor += minGapMs;
  }

  return slots.sort();
}

export function nextDueTime(state, now = new Date()) {
  const nowMs = now.getTime();
  for (const iso of state.today?.times ?? []) {
    if (state.today.completed.includes(iso)) continue;
    if (new Date(iso).getTime() <= nowMs) return iso;
  }
  return null;
}

export function updateManifest(config, entry) {
  mkdirSync(dirname(config.manifestPath), { recursive: true });
  let manifest = { fragments: [], lastUpdated: null };
  if (existsSync(config.manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(config.manifestPath, "utf8"));
    } catch {
      manifest = { fragments: [], lastUpdated: null };
    }
  }
  manifest.fragments.push(entry);
  manifest.lastUpdated = new Date().toISOString();
  manifest.totalFragments = manifest.fragments.length;
  writeFileSync(config.manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
