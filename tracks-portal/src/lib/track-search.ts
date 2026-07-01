import type { EnrichedSequenceItem, EnrichedTrack } from './types';

/** Normalize for case-insensitive substring matching. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Search-only synonym map: query terms expand to related index terms.
 * Canonical keys are primary tags; values are aliases indexed in the haystack.
 */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  horror: ['scary', 'creepy', 'spooky', 'frightening', 'terror', 'haunted'],
  scary: ['horror', 'creepy', 'spooky', 'frightening'],
  creepy: ['horror', 'scary', 'spooky', 'eerie'],
  spooky: ['horror', 'scary', 'creepy'],
  film: ['movie', 'cinema', 'movies', 'motion-picture'],
  movie: ['film', 'cinema', 'movies'],
  cinema: ['film', 'movie', 'movies'],
  show: ['tv', 'television', 'series'],
  tv: ['show', 'television', 'series'],
  documentary: ['doc', 'nonfiction', 'true-story'],
  book: ['novel', 'literature', 'reading', 'literary'],
  novel: ['book', 'literature', 'literary'],
  literary: ['book', 'novel', 'literature'],
  dystopia: ['dystopian', 'resistance', 'future', 'totalitarian', 'oppression'],
  dystopian: ['dystopia', 'resistance', 'future', 'totalitarian'],
  resistance: ['rebellion', 'revolt', 'dystopia', 'uprising'],
  'sci-fi': ['science-fiction', 'scifi', 'sf', 'futuristic', 'space'],
  'science-fiction': ['sci-fi', 'scifi', 'sf', 'futuristic'],
  fantasy: ['magic', 'sword', 'sorcery', 'mythic'],
  philosophy: ['existential', 'ethics', 'ideas', 'thought'],
  existential: ['philosophy', 'meaning', 'absurdism'],
  'true-crime': ['murder', 'investigation', 'criminal', 'nonfiction'],
  crime: ['criminal', 'noir', 'heist', 'detective'],
  sports: ['athletics', 'competition', 'betting', 'gambling'],
  music: ['song', 'band', 'musician', 'audio'],
  kids: ['children', 'family', 'young', 'child'],
  teens: ['teen', 'ya', 'young-adult', 'adolescent'],
  family: ['kids', 'children', 'all-ages'],
  games: ['gaming', 'videogame', 'boardgame', 'play'],
  videogame: ['video-game', 'gaming', 'games', 'roguelike'],
  boardgame: ['board-game', 'tabletop', 'games'],
  war: ['combat', 'military', 'battle', 'conflict'],
  nature: ['wilderness', 'outdoors', 'environment', 'eco'],
  mystery: ['detective', 'whodunit', 'suspense', 'investigation'],
  thriller: ['suspense', 'tension', 'psychological'],
  comedy: ['funny', 'humor', 'satire', 'parody'],
  satire: ['comedy', 'parody', 'social-commentary'],
  western: ['cowboy', 'frontier', 'outlaw'],
  noir: ['detective', 'shadow', 'crime', 'mystery'],
  mythology: ['myth', 'legend', 'folklore', 'gods'],
  ai: ['artificial-intelligence', 'robot', 'android', 'machine'],
  hacking: ['hacker', 'cyber', 'infosec', 'security'],
  cyberpunk: ['hacker', 'dystopia', 'neon', 'future'],
  cooking: ['food', 'chef', 'culinary', 'kitchen'],
  food: ['cooking', 'chef', 'culinary', 'gastronomy'],
  craft: ['artisan', 'maker', 'handmade', 'woodworking'],
  animation: ['cartoon', 'animated', 'anime'],
  cartoon: ['animation', 'animated'],
  survival: ['apocalypse', 'post-apocalyptic', 'wilderness'],
  apocalypse: ['post-apocalyptic', 'collapse', 'end-of-world'],
  lovecraft: ['cosmic-horror', 'eldritch', 'lovecraftian'],
  journal: ['journalism', 'reporter', 'press', 'news'],
  journalism: ['reporter', 'press', 'news', 'investigative'],
};

function pushTerms(bucket: string[], ...values: Array<string | number | undefined | null>) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) bucket.push(text);
  }
}

function collectItemTerms(item: EnrichedSequenceItem): string[] {
  const terms: string[] = [];
  pushTerms(terms, item.title, item.author, item.type, item.note, item.year);
  const meta = item.metadata;
  if (meta) {
    pushTerms(terms, meta.overview, meta.year, ...(meta.genres ?? []));
  }
  for (const [key, value] of Object.entries(item)) {
    if (['title', 'author', 'type', 'note', 'metadata', 'id', 'year'].includes(key)) {
      continue;
    }
    if (typeof value === 'string') pushTerms(terms, value);
  }
  return terms;
}

/** Light stem variants for fuzzy substring matching. */
export function stemVariants(term: string): string[] {
  const variants = new Set<string>([term]);
  if (term.length < 4) return [...variants];

  if (term.endsWith('ies') && term.length > 5) {
    variants.add(term.slice(0, -3) + 'y');
  }
  if (term.endsWith('ing') && term.length > 6) {
    variants.add(term.slice(0, -3));
    variants.add(term.slice(0, -3) + 'e');
  }
  if (term.endsWith('ed') && term.length > 5) {
    variants.add(term.slice(0, -2));
    variants.add(term.slice(0, -1));
  }
  if (term.endsWith('s') && !term.endsWith('ss') && term.length > 4) {
    variants.add(term.slice(0, -1));
  }

  return [...variants].filter((v) => v.length >= 3);
}

/** Expand a term with synonyms (bidirectional). */
export function expandTermWithSynonyms(term: string): string[] {
  const expanded = new Set<string>([term]);
  const direct = SEARCH_SYNONYMS[term];
  if (direct) {
    for (const alias of direct) expanded.add(alias);
  }
  for (const [canonical, aliases] of Object.entries(SEARCH_SYNONYMS)) {
    if (aliases.includes(term)) {
      expanded.add(canonical);
      for (const alias of aliases) expanded.add(alias);
    }
  }
  return [...expanded];
}

/** Tags + synonym aliases for search index only. */
function tagsToSearchTerms(tags: string[]): string[] {
  const terms = new Set<string>();
  for (const tag of tags) {
    const normalized = normalizeSearchText(tag);
    terms.add(normalized);
    for (const expanded of expandTermWithSynonyms(normalized)) {
      terms.add(expanded);
      for (const stem of stemVariants(expanded)) {
        terms.add(stem);
      }
    }
  }
  return [...terms];
}

/** Build a single normalized haystack for multi-field search. */
export function buildTrackHaystack(track: EnrichedTrack): string {
  const parts: string[] = [
    track.id,
    track.title,
    track.description,
    ...(track.tags ?? []),
    ...tagsToSearchTerms(track.tags ?? []),
  ];
  for (const item of track.sequence) {
    parts.push(...collectItemTerms(item));
  }
  for (const item of track.supplemental ?? []) {
    parts.push(...collectItemTerms(item));
  }
  return normalizeSearchText(parts.join(' '));
}

export interface TrackSearchEntry {
  id: string;
  title: string;
  description: string;
  haystack: string;
  stopCount: number;
  tier: number;
  sortOrder: number;
}

export function compareTracksByTier(
  a: Pick<TrackSearchEntry, 'tier' | 'sortOrder' | 'title'>,
  b: Pick<TrackSearchEntry, 'tier' | 'sortOrder' | 'title'>,
): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function buildTrackSearchIndex(tracks: EnrichedTrack[]): TrackSearchEntry[] {
  return tracks
    .map((track) => ({
      id: track.id,
      title: track.title,
      description: track.description,
      haystack: buildTrackHaystack(track),
      stopCount: track.sequence.length + (track.supplemental?.length ?? 0),
      tier: track.tier ?? 2,
      sortOrder: track.sortOrder ?? 999,
    }))
    .sort(compareTracksByTier);
}

export function parseSearchQuery(raw: string): string[] {
  return normalizeSearchText(raw).split(' ').filter(Boolean);
}

function termMatchesHaystack(haystack: string, term: string): boolean {
  const candidates = new Set<string>();
  for (const expanded of expandTermWithSynonyms(term)) {
    for (const stem of stemVariants(expanded)) {
      candidates.add(stem);
    }
  }
  for (const candidate of candidates) {
    if (haystack.includes(candidate)) return true;
  }
  return false;
}

export function trackMatchesQuery(haystack: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  return terms.every((term) => termMatchesHaystack(haystack, term));
}
