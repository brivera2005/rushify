export type MediaType =
  | 'book'
  | 'movie'
  | 'show'
  | 'documentary'
  | 'boardgame'
  | 'videogame';

export interface SequenceItem {
  id?: string;
  type: MediaType;
  title: string;
  author?: string;
  year?: number;
  note?: string;
}

export interface TrackProgressState {
  completedItems: string[];
  lastVisited: string;
}

export interface ItemMetadata {
  posterUrl?: string;
  coverUrl?: string;
  overview?: string;
  genres?: string[];
  rating?: number;
  ratingCount?: number;
  amazonUrl?: string;
  tmdbId?: number;
  mediaType?: 'movie' | 'tv';
  openLibraryKey?: string;
  openLibraryUrl?: string;
  year?: number;
}

export interface EnrichedSequenceItem extends SequenceItem {
  metadata?: ItemMetadata;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  sequence: SequenceItem[];
  supplemental?: SequenceItem[];
  tags?: string[];
  relatedTrackIds?: string[];
}

export interface EnrichedTrack extends Track {
  sequence: EnrichedSequenceItem[];
  supplemental?: EnrichedSequenceItem[];
}
