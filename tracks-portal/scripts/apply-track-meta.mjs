/**
 * Assigns tier (1=prestige, 2=standard, 3=fun/kids/games) and expands discovery tags.
 * Run: node scripts/apply-track-meta.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACKS_PATH = join(__dirname, '..', 'src', 'data', 'tracks.json');

/** Hand-picked elite set — tier-1 prestige + best teens picks only. */
const CURATED_TRACK_IDS = new Set([
  'existential-ai',
  'surreal-sci-fi',
  'architecture-of-tragedy',
  'cosmic-horror',
  'dystopian-bureaucracy',
  'generational-epic',
  'true-crime-systemic-failure',
  'fourth-estate',
  'art-of-dialogue',
  'cosmic-inevitability',
  'cinematic-meta-narrative',
  'imperial-collapse',
  'cold-war-paranoia',
  'unreliable-perspective',
  'folk-horror-pagan',
  'fractured-timeline',
  'ancient-myths-remade',
  'philosophical-martial-arts',
  'craft-and-legacy',
  'silent-apocalypse',
  'conspiratorial-backrooms',
  'gonzo-journalism',
  'gothic-wonder-teens',
  'elevated-dystopia-teens',
  'mythic-quests-teens',
]);

/** Index display order (prestige first, teens last). */
const DISPLAY_ORDER = [...CURATED_TRACK_IDS];

/** @type {Record<string, 1|2|3>} */
const TIERS = {
  // Tier 1 — literary, documentary, serious adult themes
  'existential-ai': 1,
  'surreal-sci-fi': 1,
  'architecture-of-tragedy': 1,
  'cosmic-horror': 1,
  'dystopian-bureaucracy': 1,
  'generational-epic': 1,
  'art-of-dialogue': 1,
  'cosmic-inevitability': 1,
  'fourth-estate': 1,
  'true-crime-systemic-failure': 1,
  'imperial-collapse': 1,
  'cinematic-meta-narrative': 1,
  'cold-war-paranoia': 1,
  'unreliable-perspective': 1,
  'conspiratorial-backrooms': 1,
  'gonzo-journalism': 1,
  'fractured-timeline': 1,
  'folk-horror-pagan': 1,
  'silent-apocalypse': 1,
  'ancient-myths-remade': 1,
  'philosophical-martial-arts': 1,
  'craft-and-legacy': 1,

  // Tier 2 — strong genre paths, v2 deep dives, substantive branching
  'dark-fantasy-foundations': 2,
  'digital-frontier': 2,
  'transhuman-ascent': 2,
  'perfect-sound': 2,
  'roots-of-rhythm': 2,
  'sovereign-analytical-edge': 2,
  'anatomy-of-the-job': 2,
  'western-requiem': 2,
  'noir-shadow': 2,
  'time-as-weapon': 2,
  'space-opera-scale': 2,
  'satirical-mirror': 2,
  'corporate-machine': 2,
  'culinary-obsession': 2,
  'suburban-decay': 2,
  'cognitive-warfare': 2,
  'tech-nomad-cyber-warfare': 2,
  'primal-frontier': 2,
  'anatomy-of-retribution': 2,
  'subterranean-unconscious': 2,
  'flesh-transformed': 2,
  'lost-artifacts': 2,
  'eco-collapse': 2,
  'abyssal-trench': 2,
  'existential-ai-v2': 2,
  'surreal-sci-fi-v2': 2,
  'dark-fantasy-v2': 2,
  'digital-frontier-v2': 2,
  'transhuman-ascent-v2': 2,
  'perfect-sound-v2': 2,
  'roots-of-rhythm-v2': 2,
  'sovereign-analytical-v2': 2,
  'anatomy-of-the-job-v2': 2,
  'western-requiem-v2': 2,
  'architecture-of-tragedy-v2': 2,
  'craft-legacy-v2': 2,
  'dark-fantasy-campaign': 2,
  'epic-fantasy-tapestry': 2,
  'cosmic-horror-isolation': 2,
  'grimdark-ascendant': 2,
  'horror-evolution': 2,
  'automation-engine': 2,
  'indie-artisan': 2,
  'digital-frontier-branching': 2,
  'sovereign-analytical-mix': 2,

  // Tier 3 — kids, teens, lighter fun, games-only
  'saturday-morning-worlds': 3,
  'gateway-fantasy': 3,
  'stem-wonders': 3,
  'adventure-first': 3,
  'folklore-legends-kids': 3,
  'cosmic-journeys-kids': 3,
  'wilderness-call-kids': 3,
  'picture-book-pals-kids': 3,
  'inventors-tinkerers-kids': 3,
  'gothic-wonder-teens': 3,
  'elevated-dystopia-teens': 3,
  'retro-mystery-teens': 3,
  'high-school-satire-teens': 3,
  'first-chills-teens': 3,
  'mythic-quests-teens': 3,
  'tabletop-legends': 3,
  'pure-video-game-vibe': 3,
  'pure-board-game-engine': 3,
};

/** Extra discovery tags merged into each track (deduped with existing). */
/** @type {Record<string, string[]>} */
const TAG_ENRICHMENTS = {
  'existential-ai': ['consciousness', 'identity', 'android', 'robot', 'ethics', 'literary'],
  'surreal-sci-fi': ['dreamlike', 'paradox', 'reality', 'psychological', 'literary'],
  'dark-fantasy-foundations': ['grimdark', 'medieval', 'moral-gray', 'sword', 'sorcery'],
  'digital-frontier': ['hacker', 'network', 'surveillance', 'crypto', 'techno-thriller'],
  'transhuman-ascent': ['immortality', 'enhancement', 'genetics', 'future', 'medical'],
  'perfect-sound': ['audio', 'recording', 'producer', 'studio', 'musician'],
  'roots-of-rhythm': ['americana', 'songwriter', 'guitar', 'roots', 'folk'],
  'sovereign-analytical-edge': ['betting', 'odds', 'statistics', 'analytics', 'sports'],
  'anatomy-of-the-job': ['heist', 'robbery', 'criminal', 'caper', 'noir'],
  'western-requiem': ['frontier', 'cowboy', 'outlaw', 'revenge', 'americana'],
  'architecture-of-tragedy': ['war', 'holocaust', 'documentary', 'historical', 'trauma'],
  'cold-war-paranoia': ['espionage', 'spy', 'conspiracy', 'nuclear', 'thriller'],
  'cosmic-horror': ['lovecraft', 'eldritch', 'void', 'madness', 'cosmic', 'literary'],
  'craft-and-legacy': ['woodworking', 'maker', 'artisan', 'design', 'architecture'],
  'tech-nomad-cyber-warfare': ['infosec', 'homelab', 'privacy', 'ops', 'security'],
  'imperial-collapse': ['empire', 'rome', 'historical', 'epic', 'fall'],
  'primal-frontier': ['wilderness', 'outdoors', 'survival', 'nature', 'frontier'],
  'unreliable-perspective': ['twist', 'unreliable-narrator', 'psychological', 'mystery'],
  'dystopian-bureaucracy': ['kafka', 'totalitarian', 'satire', 'bureaucracy', 'literary'],
  'ancient-myths-remade': ['mythology', 'classics', 'greek', 'retelling', 'literary'],
  'true-crime-systemic-failure': ['investigation', 'justice', 'documentary', 'nonfiction'],
  'cinematic-meta-narrative': ['filmmaking', 'hollywood', 'director', 'cinema', 'art'],
  'satirical-mirror': ['comedy', 'parody', 'social-commentary', 'dark-comedy'],
  'space-opera-scale': ['galactic', 'starship', 'alien', 'epic', 'adventure'],
  'time-as-weapon': ['time-travel', 'temporal', 'paradox', 'sci-fi'],
  'noir-shadow': ['detective', 'mystery', 'crime', 'shadow', 'classic'],
  'anatomy-of-retribution': ['revenge', 'vigilante', 'action', 'thriller'],
  'folk-horror-pagan': ['rural', 'pagan', 'ritual', 'occult', 'british'],
  'subterranean-unconscious': ['underground', 'cave', 'claustrophobia', 'expedition'],
  'silent-apocalypse': ['post-apocalyptic', 'collapse', 'end-of-world', 'survival'],
  'corporate-machine': ['finance', 'wall-street', 'capitalism', 'business', 'satire'],
  'fractured-timeline': ['nonlinear', 'experimental', 'memory', 'literary'],
  'culinary-obsession': ['chef', 'restaurant', 'food', 'gastronomy', 'kitchen'],
  'suburban-decay': ['suburb', 'americana', 'melancholy', 'drama'],
  'philosophical-martial-arts': ['kung-fu', 'eastern', 'discipline', 'wuxia'],
  'saturday-morning-worlds': ['cartoon', 'animation', 'family', 'nostalgia'],
  'gateway-fantasy': ['young-reader', 'portal', 'magic', 'adventure'],
  'stem-wonders': ['science', 'engineering', 'education', 'discovery'],
  'adventure-first': ['exploration', 'quest', 'family', 'animation'],
  'conspiratorial-backrooms': ['political', 'power', 'democracy', 'thriller'],
  'fourth-estate': ['press', 'reporter', 'news', 'investigative', 'nonfiction'],
  'flesh-transformed': ['body-horror', 'mutation', 'gore', 'cronenberg'],
  'lost-artifacts': ['found-footage', 'tape', 'curse', 'supernatural'],
  'eco-collapse': ['climate', 'environment', 'nature', 'apocalypse'],
  'generational-epic': ['family-saga', 'dynasty', 'literary', 'drama'],
  'gonzo-journalism': ['counterculture', 'absurdist', 'reportage', 'literary'],
  'abyssal-trench': ['ocean', 'deep-sea', 'isolation', 'pressure'],
  'cosmic-inevitability': ['existential', 'absurdism', 'philosophy', 'doom'],
  'art-of-dialogue': ['conversation', 'intimate', 'literary', 'theater'],
  'cognitive-warfare': ['chess', 'strategy', 'mind-games', 'competition'],
  'folklore-legends-kids': ['myth', 'legend', 'fairy-tale', 'young'],
  'cosmic-journeys-kids': ['astronomy', 'space', 'exploration', 'young'],
  'wilderness-call-kids': ['camping', 'forest', 'animals', 'young'],
  'gothic-wonder-teens': ['gothic', 'dark-fantasy', 'ya', 'coming-of-age'],
  'elevated-dystopia-teens': ['ya', 'rebellion', 'utopia', 'resistance'],
  'retro-mystery-teens': ['80s', 'nostalgia', 'small-town', 'supernatural'],
  'high-school-satire-teens': ['prep-school', 'wit', 'ya', 'dark-academia'],
  'picture-book-pals-kids': ['picture-book', 'illustrated', 'preschool', 'gentle'],
  'inventors-tinkerers-kids': ['invention', 'robot', 'maker', 'stem'],
  'first-chills-teens': ['gateway-horror', 'spooky', 'supernatural', 'ya'],
  'mythic-quests-teens': ['quest', 'hero', 'ya', 'epic'],
  'tabletop-legends': ['boardgame', 'tabletop', 'dice', 'cooperative'],
  'pure-video-game-vibe': ['videogame', 'gaming', 'roguelike', 'indie-game'],
  'pure-board-game-engine': ['boardgame', 'euro', 'strategy', 'tabletop'],
  'digital-frontier-branching': ['cyberpunk', 'branching', 'interactive'],
  'sovereign-analytical-mix': ['probability', 'games', 'analytics'],
  'dark-fantasy-campaign': ['dnd', 'rpg', 'grimdark', 'campaign'],
  'epic-fantasy-tapestry': ['high-fantasy', 'epic', 'worldbuilding'],
  'cosmic-horror-isolation': ['lovecraft', 'isolation', 'madness'],
  'grimdark-ascendant': ['grimdark', 'war', 'dark-fantasy'],
  'horror-evolution': ['slasher', 'survival-horror', 'classic-horror'],
  'automation-engine': ['automation', 'factory', 'sci-fi', 'systems'],
  'indie-artisan': ['indie', 'handmade', 'boutique', 'craft'],
};

const V2_EXTRA = ['sequel', 'deep-dive', 'advanced'];

function mergeTags(existing, extra) {
  const set = new Set([...(existing ?? []), ...extra]);
  return [...set].sort();
}

function main() {
  let tracks = JSON.parse(readFileSync(TRACKS_PATH, 'utf8'));
  const before = tracks.length;
  tracks = tracks.filter((t) => CURATED_TRACK_IDS.has(t.id));
  if (tracks.length < before) {
    console.log(`Curated: kept ${tracks.length} of ${before} tracks`);
  }

  let missing = 0;
  const orderIndex = Object.fromEntries(DISPLAY_ORDER.map((id, i) => [id, i + 1]));

  for (const track of tracks) {
    const tier = TIERS[track.id];
    if (!tier) {
      console.warn(`Missing tier for: ${track.id}`);
      missing += 1;
      track.tier = 2;
    } else {
      track.tier = tier;
    }

    track.sortOrder = orderIndex[track.id] ?? 999;

    const extra = [...(TAG_ENRICHMENTS[track.id] ?? [])];
    if (track.id.endsWith('-v2') || track.tags?.includes('v2')) {
      extra.push(...V2_EXTRA);
    }
    track.tags = mergeTags(track.tags, extra);

    if (track.relatedTrackIds?.length) {
      track.relatedTrackIds = track.relatedTrackIds.filter((id) => CURATED_TRACK_IDS.has(id));
      if (!track.relatedTrackIds.length) delete track.relatedTrackIds;
    }
  }

  if (missing) {
    console.warn(`${missing} tracks had no explicit tier (defaulted to 2)`);
  }

  writeFileSync(TRACKS_PATH, JSON.stringify(tracks, null, 2));
  console.log(`Updated ${tracks.length} tracks with tier + enriched tags`);
}

main();
