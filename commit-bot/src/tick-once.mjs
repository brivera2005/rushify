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

/** Single check: plan today if needed, drop one hint if a slot is due. */
export function tickOnce(now = new Date()) {
  loadDotEnv();
  const config = loadConfig(process.env);
  configureGitIdentity(config);

  let state = loadState(config);
  state = ensureTodaySchedule(state, config, now);
  saveState(config, state);

  const due = nextDueTime(state, now);
  if (!due) {
    const remaining =
      (state.today?.times?.length ?? 0) - (state.today?.completed?.length ?? 0);
    return {
      action: "idle",
      date: todayKey(now),
      remaining,
    };
  }

  const result = dropHint({ dueIso: due, now });
  return {
    action: "dropped",
    date: todayKey(now),
    due,
    fragment: result.fragment.seq,
    node: result.fragment.nodeId,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outcome = tickOnce();
  console.log(JSON.stringify(outcome));
  process.exit(outcome.action === "dropped" ? 0 : 0);
}
