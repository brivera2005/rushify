/** Jellyfin TMDB index for RushTV library availability (Worker runtime). */

export interface AvailabilityEnv {
  JELLYFIN_SERVER_URL?: string;
  JELLYFIN_API_KEY?: string;
}

export type TmdbRef = `movie:${number}` | `tv:${number}`;

interface JellyfinItem {
  ProviderIds?: { Tmdb?: string };
}

interface JellyfinItemsResponse {
  Items?: JellyfinItem[];
  TotalRecordCount?: number;
}

interface LibraryIndex {
  movies: Set<number>;
  shows: Set<number>;
  expiresAt: number;
}

let indexCache: LibraryIndex | null = null;
const INDEX_TTL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 500;

function jellyfinConfigured(env: AvailabilityEnv): boolean {
  return Boolean(env.JELLYFIN_SERVER_URL?.trim() && env.JELLYFIN_API_KEY?.trim());
}

function baseUrl(env: AvailabilityEnv): string {
  return env.JELLYFIN_SERVER_URL!.replace(/\/$/, '');
}

async function jellyfinGet<T>(env: AvailabilityEnv, path: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${baseUrl(env)}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Emby-Token': env.JELLYFIN_API_KEY!,
      },
      cf: { cacheTtl: 60, cacheEverything: false },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchTmdbIds(env: AvailabilityEnv, itemType: 'Movie' | 'Series'): Promise<Set<number>> {
  const ids = new Set<number>();
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const page = await jellyfinGet<JellyfinItemsResponse>(env, '/Items', {
      Recursive: 'true',
      IncludeItemTypes: itemType,
      Fields: 'ProviderIds',
      StartIndex: String(start),
      Limit: String(PAGE_SIZE),
    });
    if (!page?.Items) break;

    for (const item of page.Items) {
      const raw = item.ProviderIds?.Tmdb;
      if (!raw) continue;
      const id = Number.parseInt(raw, 10);
      if (Number.isFinite(id)) ids.add(id);
    }

    total = page.TotalRecordCount ?? page.Items.length;
    start += page.Items.length;
    if (!page.Items.length) break;
  }

  return ids;
}

async function getLibraryIndex(env: AvailabilityEnv): Promise<LibraryIndex | null> {
  if (!jellyfinConfigured(env)) return null;

  if (indexCache && Date.now() < indexCache.expiresAt) {
    return indexCache;
  }

  const [movies, shows] = await Promise.all([
    fetchTmdbIds(env, 'Movie'),
    fetchTmdbIds(env, 'Series'),
  ]);

  indexCache = {
    movies,
    shows,
    expiresAt: Date.now() + INDEX_TTL_MS,
  };
  return indexCache;
}

export function parseTmdbRef(raw: string): { mediaType: 'movie' | 'tv'; tmdbId: number } | null {
  const match = /^([a-z]+):(\d+)$/i.exec(raw.trim());
  if (!match) return null;
  const kind = match[1].toLowerCase();
  const tmdbId = Number.parseInt(match[2], 10);
  if (!Number.isFinite(tmdbId)) return null;
  if (kind === 'movie' || kind === 'movies') return { mediaType: 'movie', tmdbId };
  if (kind === 'tv' || kind === 'show' || kind === 'series') return { mediaType: 'tv', tmdbId };
  return null;
}

export async function resolveAvailability(
  env: AvailabilityEnv,
  refs: string[],
): Promise<{ configured: boolean; items: Record<string, { available: boolean }> }> {
  const items: Record<string, { available: boolean }> = {};
  const index = await getLibraryIndex(env);

  if (!index) {
    return { configured: false, items };
  }

  for (const ref of refs) {
    const parsed = parseTmdbRef(ref);
    if (!parsed) continue;
    const key = `${parsed.mediaType}:${parsed.tmdbId}`;
    const available =
      parsed.mediaType === 'movie'
        ? index.movies.has(parsed.tmdbId)
        : index.shows.has(parsed.tmdbId);
    items[key] = { available };
  }

  return { configured: true, items };
}
