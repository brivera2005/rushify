import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  loadState,
  saveState,
  ensureTodaySchedule,
  updateManifest,
} from "./state.mjs";
import {
  advanceMaze,
  generateFragment,
  commitMessage,
  renderFragmentMarkdown,
} from "./narrative.mjs";
import { configureGitIdentity, gitCommit } from "./git.mjs";

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

export function dropHint(options = {}) {
  loadDotEnv();
  const config = loadConfig(process.env);
  configureGitIdentity(config);

  let state = loadState(config);
  state = ensureTodaySchedule(state, config, options.now ?? new Date());

  advanceMaze(state);
  const fragment = generateFragment(state);

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "")
    .slice(0, 15);
  const filename = `${stamp}-frag-${String(fragment.seq).padStart(4, "0")}.md`;
  const relFragment = join(config.hintDir, "fragments", filename).replace(/\\/g, "/");
  const relManifest = join(config.hintDir, "manifest.json").replace(/\\/g, "/");
  const absFragment = join(config.repoPath, config.hintDir, "fragments", filename);

  mkdirSync(dirname(absFragment), { recursive: true });
  writeFileSync(absFragment, renderFragmentMarkdown(fragment, state), "utf8");

  updateManifest(config, {
    id: `frag-${String(fragment.seq).padStart(4, "0")}`,
    file: relFragment,
    sequence: fragment.seq,
    day: state.dayNumber,
    node: fragment.nodeId,
    type: fragment.fragmentType,
    redHerring: fragment.isRedHerring,
    at: new Date().toISOString(),
  });

  const message = commitMessage(fragment);
  const result = gitCommit(config, [relFragment, relManifest], message);

  state.fragmentIndex = fragment.seq;
  state.stats.totalCommits = (state.stats.totalCommits ?? 0) + 1;

  const dueIso = options.dueIso;
  if (dueIso && state.today?.times?.includes(dueIso)) {
    if (!state.today.completed.includes(dueIso)) {
      state.today.completed.push(dueIso);
    }
  }

  saveState(config, state);

  console.log(
    `[drop] #${fragment.seq} ${fragment.fragmentType} @ ${fragment.nodeId} → ${filename}`
  );

  return { fragment, filename, result, state };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    dropHint();
  } catch (err) {
    console.error("[drop] failed:", err.message ?? err);
    process.exit(1);
  }
}
