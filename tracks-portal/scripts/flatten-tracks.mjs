/**
 * Flatten branching tracks into linear sequence + optional supplemental games.
 * Run after merge-tracks.mjs, before enrich-tracks.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACKS_PATH = join(__dirname, '..', 'src', 'data', 'tracks.json');

const CORE_TYPES = new Set(['book', 'movie', 'show', 'documentary']);
const GAME_TYPES = new Set(['videogame', 'boardgame', 'video-game', 'board-game']);

function normalizeType(type) {
  if (type === 'video-game') return 'videogame';
  if (type === 'board-game') return 'boardgame';
  return type;
}

function isGameType(type) {
  const t = normalizeType(type);
  return GAME_TYPES.has(t);
}

function isCoreType(type) {
  return CORE_TYPES.has(type);
}

function itemKey(item) {
  return item.id || `${item.type}:${item.title}`;
}

function stripBranchFields(item) {
  const { label, choices, vibe, required, ...rest } = item;
  return rest;
}

function flattenTrack(track) {
  const sequence = [];
  const supplemental = [];
  const seenCore = new Set();
  const seenSupp = new Set();

  const addCore = (raw) => {
    const type = normalizeType(raw.type);
    if (!isCoreType(type)) return;
    const key = itemKey(raw);
    if (seenCore.has(key)) return;
    seenCore.add(key);
    const item = stripBranchFields({ ...raw, type });
    sequence.push(item);
  };

  const addSupplemental = (raw) => {
    const type = normalizeType(raw.type);
    if (!isGameType(type)) return;
    const key = itemKey(raw);
    if (seenSupp.has(key)) return;
    seenSupp.add(key);
    supplemental.push(stripBranchFields({ ...raw, type, required: false }));
  };

  for (const item of track.sequence || []) {
    if (item.type === 'crossroads') continue;
    if (isGameType(item.type)) addSupplemental(item);
    else if (isCoreType(item.type)) addCore(item);
  }

  // Pull game items referenced only via map nodes (legacy branching data).
  if (track.map?.nodes?.length) {
    const byId = Object.fromEntries(
      (track.sequence || []).filter((s) => s.id).map((s) => [s.id, s]),
    );
    for (const node of track.map.nodes) {
      const item = byId[node.itemId];
      if (item) addSupplemental(item);
    }
  }

  for (const item of track.supplemental || []) {
    addSupplemental(item);
  }

  const flat = { ...track, sequence };
  if (supplemental.length) flat.supplemental = supplemental;
  else delete flat.supplemental;
  delete flat.map;

  return flat;
}

function main() {
  const tracks = JSON.parse(readFileSync(TRACKS_PATH, 'utf8'));
  const flattened = tracks.map(flattenTrack);
  writeFileSync(TRACKS_PATH, JSON.stringify(flattened, null, 2));

  const withSupp = flattened.filter((t) => t.supplemental?.length).length;
  const hadMaps = tracks.filter((t) => t.map).length;
  console.log(`Flattened ${flattened.length} tracks (${hadMaps} had maps, ${withSupp} have supplemental)`);
}

main();
