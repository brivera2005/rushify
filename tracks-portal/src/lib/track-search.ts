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
  // Future-proof: index any extra string fields (developer, designer, etc.)
  for (const [key, value] of Object.entries(item)) {
    if (['title', 'author', 'type', 'note', 'metadata', 'id', 'year'].includes(key)) {
      continue;
    }
    if (typeof value === 'string') pushTerms(terms, value);
  }
  return terms;
}

/** Build a single normalized haystack for multi-field search. */
export function buildTrackHaystack(track: EnrichedTrack): string {
  const parts: string[] = [track.id, track.title, track.description, ...(track.tags ?? [])];
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
}

export function buildTrackSearchIndex(tracks: EnrichedTrack[]): TrackSearchEntry[] {
  return tracks.map((track) => ({
    id: track.id,
    title: track.title,
    description: track.description,
    haystack: buildTrackHaystack(track),
    stopCount: track.sequence.length + (track.supplemental?.length ?? 0),
  }));
}

export function parseSearchQuery(raw: string): string[] {
  return normalizeSearchText(raw).split(' ').filter(Boolean);
}

export function trackMatchesQuery(haystack: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  return terms.every((term) => haystack.includes(term));
}
