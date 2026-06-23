import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  loadState,
  saveState,
  ensureTodaySchedule,
  todayKey,
} from "./state.mjs";

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

export function planToday(now = new Date()) {
  loadDotEnv();
  const config = loadConfig(process.env);
  let state = loadState(config);
  state = ensureTodaySchedule(state, config, now);
  saveState(config, state);
  return state.today;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-US", { hour12: false });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const print = process.argv.includes("--print");
  const today = planToday();
  console.log(`[schedule] ${todayKey()} — ${today.plannedCount} commits planned`);
  if (print) {
    for (const [i, t] of today.times.entries()) {
      console.log(`  ${String(i + 1).padStart(2, " ")}. ${formatTime(t)}  (${t})`);
    }
  }
}
