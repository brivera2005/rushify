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

export function buildRushTvDetailUrl(tmdbId: number, mediaType: RushTvMediaType): string {
  return `rushtv://detail?tmdb=${mediaType}:${tmdbId}`;
}

/** Film and series track stops that can open in RushTV. */
export function isRushTvEligibleItemType(type: string): boolean {
  return type === 'movie' || type === 'show' || type === 'documentary';
}
