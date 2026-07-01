/**
 * RushTV Android TV deep links (com.tvmhub.media).
 *
 * Format: rushtv://detail?tmdb={movie|tv}:{id}
 * Optional: &action=request to auto-submit a Plex watchlist request after detail loads.
 *
 * Example: rushtv://detail?tmdb=movie:603
 * Example: rushtv://detail?tmdb=tv:1399&action=request
 */
export type RushTvMediaType = 'movie' | 'tv';

export function buildRushTvDetailUrl(
  tmdbId: number,
  mediaType: RushTvMediaType,
  action?: 'request',
): string {
  const base = `rushtv://detail?tmdb=${mediaType}:${tmdbId}`;
  return action === 'request' ? `${base}&action=request` : base;
}

export function tmdbAvailabilityKey(mediaType: RushTvMediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

/** Film and series track stops that can open in RushTV. */
export function isRushTvEligibleItemType(type: string): boolean {
  return type === 'movie' || type === 'show' || type === 'documentary';
}
