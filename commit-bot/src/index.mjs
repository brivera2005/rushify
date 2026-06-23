import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  loadState,
  saveState,
  ensureTodaySchedule,
  nextDueTime,
  todayKey,
} from "./state.mjs";
import { dropHint } from "./drop.mjs";
import { configureGitIdentity } from "./git.mjs";
import { tickOnce } from "./tick-once.mjs";

function loadDotEnv() {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = join(here, "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function tick() {
  loadDotEnv();
  const config = loadConfig(process.env);
  configureGitIdentity(config);

  let state = loadState(config);
  const now = new Date();
  state = ensureTodaySchedule(state, config, now);
  saveState(config, state);

  const due = nextDueTime(state, now);
  if (!due) {
    const remaining =
      (state.today?.times?.length ?? 0) - (state.today?.completed?.length ?? 0);
    console.log(
      `[daemon] ${todayKey(now)} — ${remaining} commits remaining today; next check in ${config.tickMs}ms`
    );
    return;
  }

  console.log(`[daemon] dropping hint for slot ${due}`);
  dropHint({ dueIso: due, now });
}

function main() {
  loadDotEnv();
  const config = loadConfig(process.env);

  if (process.argv.includes("--once")) {
    const outcome = tickOnce();
    console.log(JSON.stringify(outcome));
    return;
  }

  console.log("[daemon] The Maze commit bot starting");
  console.log(`[daemon] repo=${config.repoPath} hints=${config.hintDir}`);
  console.log(
    `[daemon] daily commits: ${config.commitsMin}-${config.commitsMax} | tz=${config.tz}`
  );

  tick();
  setInterval(tick, config.tickMs);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
