export type MediaType =
  | 'book'
  | 'movie'
  | 'show'
  | 'documentary'
  | 'boardgame'
  | 'videogame'
  | 'crossroads';

export interface CrossroadsChoice {
  label: string;
  targetId: string;
  vibe?: string;
  optional?: boolean;
}

export interface SequenceItem {
  id?: string;
  type: MediaType;
  title: string;
  author?: string;
  year?: number;
  required?: boolean;
  label?: string;
  choices?: CrossroadsChoice[];
  vibe?: string;
}

export interface MapNode {
  id: string;
  itemId: string;
  layer: number;
  slot: number;
}

export interface MapEdge {
  from: string;
  to: string;
}

export interface TrackMap {
  nodes: MapNode[];
  edges: MapEdge[];
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
  tags?: string[];
  relatedTrackIds?: string[];
  map?: TrackMap;
}

export interface EnrichedTrack extends Track {
  sequence: EnrichedSequenceItem[];
}
