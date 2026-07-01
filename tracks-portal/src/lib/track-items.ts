import type { EnrichedSequenceItem } from './types';

const CORE_TYPES = new Set(['book', 'movie', 'show', 'documentary']);
const GAME_TYPES = new Set(['videogame', 'boardgame']);

export function typeLabel(type: string): string {
  switch (type) {
    case 'book':
      return 'Book';
    case 'show':
      return 'Series';
    case 'documentary':
      return 'Documentary';
    case 'boardgame':
      return 'Board Game';
    case 'videogame':
      return 'Video Game';
    default:
      return 'Film';
  }
}

/** CSS modifier for color-coded type badges on dark backgrounds. */
export function typeBadgeClass(type: string): string {
  switch (type) {
    case 'book':
      return 'track-item-badge--book';
    case 'documentary':
      return 'track-item-badge--documentary';
    case 'show':
      return 'track-item-badge--series';
    case 'boardgame':
      return 'track-item-badge--boardgame';
    case 'videogame':
      return 'track-item-badge--videogame';
    case 'movie':
      return 'track-item-badge--film';
    default:
      return 'track-item-badge--film';
  }
}

export function isCoreItem(item: EnrichedSequenceItem): boolean {
  return CORE_TYPES.has(item.type);
}

export function isSupplementalItem(item: EnrichedSequenceItem): boolean {
  return GAME_TYPES.has(item.type);
}
