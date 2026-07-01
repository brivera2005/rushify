/**
 * Add related books, film, and games to supplemental where tracks are thin.
 * Run after flatten-tracks.mjs, before enrich-tracks.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACKS_PATH = join(__dirname, '..', 'src', 'data', 'tracks.json');

/** Extra supplemental items keyed by track id — must not duplicate core sequence titles. */
const EXPANSIONS = {
  'existential-ai': [
    { id: 'eai-supp-book-1', type: 'book', title: 'Klara and the Sun', author: 'Kazuo Ishiguro', year: 2021 },
    { id: 'eai-supp-film-1', type: 'movie', title: 'A.I. Artificial Intelligence', year: 2001 },
    { id: 'eai-supp-show-1', type: 'show', title: 'Humans (Season 1)', year: 2015 },
    { id: 'eai-supp-bg-1', type: 'boardgame', title: 'Robo Rally', author: 'Richard Garfield', year: 1999 },
  ],
  'cognitive-warfare': [
    { id: 'cw-supp-book-1', type: 'book', title: 'The Immortal Game', author: 'David Shenk', year: 2006 },
    { id: 'cw-supp-film-1', type: 'movie', title: 'Pawn Sacrifice', year: 2014 },
    { id: 'cw-supp-bg-1', type: 'boardgame', title: 'Chess', note: 'Classic chess — any quality set or app' },
  ],
  'folklore-legends-kids': [
    { id: 'flk-supp-book-1', type: 'book', title: "D'Aulaires' Book of Greek Myths", author: 'Ingri and Edgar Parin d\'Aulaire' },
    { id: 'flk-supp-film-1', type: 'movie', title: 'Kubo and the Two Strings', year: 2016 },
    { id: 'flk-supp-vg-1', type: 'videogame', title: 'Child of Light', author: 'Ubisoft Montreal', year: 2014 },
  ],
  'tabletop-legends': [
    { id: 'tl-supp-book-1', type: 'book', title: "It's All a Game", author: 'Tristan Donovan', year: 2017 },
    { id: 'tl-supp-show-1', type: 'show', title: 'TableTop', year: 2012 },
    { id: 'tl-supp-doc-1', type: 'documentary', title: 'Under the Boardwalk: The Monopoly Story', year: 2010 },
  ],
  'digital-frontier-branching': [
    { id: 'dfb-supp-book-1', type: 'book', title: 'Snow Crash', author: 'Neal Stephenson', year: 1992 },
    { id: 'dfb-supp-film-1', type: 'movie', title: 'Johnny Mnemonic', year: 1995 },
    { id: 'dfb-supp-show-1', type: 'show', title: 'Altered Carbon (Season 1)', year: 2018 },
  ],
  'pure-video-game-vibe': [
    { id: 'pvg-supp-book-1', type: 'book', title: 'Blood, Sweat, and Pixels', author: 'Jason Schreier', year: 2017 },
    { id: 'pvg-supp-doc-1', type: 'documentary', title: 'Free to Play', year: 2014 },
    { id: 'pvg-supp-film-1', type: 'movie', title: 'Tron', year: 1982 },
  ],
  'pure-board-game-engine': [
    { id: 'pbge-supp-book-1', type: 'book', title: 'The Board Game Family', author: 'Ellie Dix', year: 2020 },
    { id: 'pbge-supp-show-1', type: 'show', title: 'TableTop', year: 2012 },
    { id: 'pbge-supp-doc-1', type: 'documentary', title: 'Going Cardboard', year: 2012 },
  ],
  'sovereign-analytical-mix': [
    { id: 'sam-supp-book-1', type: 'book', title: 'The Signal and the Noise', author: 'Nate Silver', year: 2012 },
    { id: 'sam-supp-film-1', type: 'movie', title: '21', year: 2008 },
    { id: 'sam-supp-film-2', type: 'movie', title: 'Rounders', year: 1998 },
  ],
  'dark-fantasy-campaign': [
    { id: 'dfc-supp-book-1', type: 'book', title: 'The Name of the Wind', author: 'Patrick Rothfuss', year: 2007 },
    { id: 'dfc-supp-show-1', type: 'show', title: 'The Witcher (Season 1)', year: 2019 },
    { id: 'dfc-supp-film-1', type: 'movie', title: 'Conan the Barbarian', year: 1982 },
  ],
  'cosmic-horror-isolation': [
    { id: 'chi-supp-book-1', type: 'book', title: 'The Call of Cthulhu', author: 'H.P. Lovecraft', year: 1928 },
    { id: 'chi-supp-film-1', type: 'movie', title: 'The Thing', year: 1982 },
    { id: 'chi-supp-show-1', type: 'show', title: 'Lovecraft Country', year: 2020 },
  ],
  'epic-fantasy-tapestry': [
    { id: 'eft-supp-book-1', type: 'book', title: 'The Fellowship of the Ring', author: 'J.R.R. Tolkien', year: 1954 },
    { id: 'eft-supp-film-1', type: 'movie', title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001 },
    { id: 'eft-supp-show-1', type: 'show', title: 'The Wheel of Time (Season 1)', year: 2021 },
  ],
  'grimdark-ascendant': [
    { id: 'ga-supp-book-1', type: 'book', title: 'Prince of Thorns', author: 'Mark Lawrence', year: 2011 },
    { id: 'ga-supp-show-1', type: 'show', title: 'Vinland Saga (Season 1)', year: 2019 },
    { id: 'ga-supp-film-1', type: 'movie', title: 'Conan the Barbarian', year: 1982 },
  ],
  'horror-evolution': [
    { id: 'he-supp-book-1', type: 'book', title: 'The Shining', author: 'Stephen King', year: 1977 },
    { id: 'he-supp-film-1', type: 'movie', title: 'The Exorcist', year: 1973 },
    { id: 'he-supp-show-1', type: 'show', title: 'The Haunting of Hill House (Netflix)', year: 2018 },
  ],
  'automation-engine': [
    { id: 'ae-supp-book-1', type: 'book', title: 'Autonomous', author: 'Annalee Newitz', year: 2017 },
    { id: 'ae-supp-film-1', type: 'movie', title: 'Ex Machina', year: 2014 },
    { id: 'ae-supp-doc-1', type: 'documentary', title: 'AlphaGo', year: 2017 },
  ],
  'indie-artisan': [
    { id: 'ia-supp-book-1', type: 'book', title: 'Masters of Doom', author: 'David Kushner', year: 2003 },
    { id: 'ia-supp-doc-1', type: 'documentary', title: 'Double Fine Adventure', year: 2015 },
    { id: 'ia-supp-film-1', type: 'movie', title: 'The Last Starfighter', year: 1984 },
  ],
};

function itemKey(item) {
  return `${item.type}:${item.title}`.toLowerCase();
}

function mergeSupplemental(track, extras) {
  const coreKeys = new Set((track.sequence || []).map(itemKey));
  const existing = track.supplemental || [];
  const seen = new Set([...coreKeys, ...existing.map(itemKey)]);
  const merged = [...existing];

  for (const item of extras) {
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  if (merged.length) track.supplemental = merged;
  else delete track.supplemental;
  return track;
}

function main() {
  const tracks = JSON.parse(readFileSync(TRACKS_PATH, 'utf8'));
  let expanded = 0;

  const updated = tracks.map((track) => {
    const extras = EXPANSIONS[track.id];
    if (!extras?.length) return track;
    const before = track.supplemental?.length ?? 0;
    const next = mergeSupplemental({ ...track }, extras);
    if ((next.supplemental?.length ?? 0) > before) expanded += 1;
    return next;
  });

  writeFileSync(TRACKS_PATH, JSON.stringify(updated, null, 2));
  console.log(`Expanded supplemental on ${expanded} tracks`);
}

main();
