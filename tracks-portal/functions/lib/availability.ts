/** Plex (primary) + Jellyfin (fallback) TMDB index for RushTV library availability. */

export interface AvailabilityEnv {
  PLEX_SERVER_URL?: string;
  PLEX_URL?: string;
  PLEX_TOKEN?: string;
  JELLYFIN_SERVER_URL?: string;
  JELLYFIN_API_KEY?: string;
}

export type TmdbRef = `movie:${number}` | `tv:${number}`;

interface LibraryIndex {
  movies: Set<number>;
  shows: Set<number>;
  expiresAt: number;
}

let indexCache: LibraryIndex | null = null;
const INDEX_TTL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 500;

function plexServerUrl(env: AvailabilityEnv): string | null {
  const raw = env.PLEX_SERVER_URL?.trim() || env.PLEX_URL?.trim();
  return raw ? raw.replace(/\/$/, '') : null;
}

function plexConfigured(env: AvailabilityEnv): boolean {
  return Boolean(plexServerUrl(env) && env.PLEX_TOKEN?.trim());
}

function jellyfinConfigured(env: AvailabilityEnv): boolean {
  return Boolean(env.JELLYFIN_SERVER_URL?.trim() && env.JELLYFIN_API_KEY?.trim());
}

function availabilityConfigured(env: AvailabilityEnv): boolean {
  return plexConfigured(env) || jellyfinConfigured(env);
}

interface PlexGuid {
  id?: string;
}

interface PlexMetadata {
  guid?: string;
  Guid?: PlexGuid[];
  type?: string;
}

interface PlexMediaContainer {
  Metadata?: PlexMetadata[];
  Directory?: PlexSection[];
  totalSize?: number;
  size?: number;
  offset?: number;
}

interface PlexSection {
  key?: string;
  type?: string;
}

interface PlexResponse {
  MediaContainer?: PlexMediaContainer;
}

interface JellyfinItem {
  ProviderIds?: { Tmdb?: string };
}

interface JellyfinItemsResponse {
  Items?: JellyfinItem[];
  TotalRecordCount?: number;
}

function parseTmdbFromGuid(guid: string | undefined, sectionType: 'movie' | 'show'): number | null {
  if (!guid) return null;

  const modern = /(?:themoviedb|tmdb):\/\/(?:movie|tv)\/(\d+)/i.exec(guid);
  if (modern) return Number.parseInt(modern[1], 10);

  const legacy = /com\.plexapp\.agents\.themoviedb:\/\/(\d+)/i.exec(guid);
  if (legacy) return Number.parseInt(legacy[1], 10);

  const loose = /(?:movie|tv)\/(\d+)(?:\b|\/|\?)/i.exec(guid);
  if (loose) return Number.parseInt(loose[1], 10);

  if (sectionType === 'movie' && /\/(\d+)(?:\?|$)/.test(guid)) {
    const id = Number.parseInt(guid.replace(/.*:\/\/(\d+).*/, '$1'), 10);
    if (Number.isFinite(id)) return id;
  }

  return null;
}

function collectTmdbIds(metadata: PlexMetadata, sectionType: 'movie' | 'show'): number[] {
  const ids: number[] = [];
  const guids = [metadata.guid, ...(metadata.Guid?.map((g) => g.id) ?? [])].filter(Boolean) as string[];

  for (const guid of guids) {
    const id = parseTmdbFromGuid(guid, sectionType);
    if (id != null && Number.isFinite(id)) ids.push(id);
  }

  return ids;
}

async function plexGet<T>(env: AvailabilityEnv, path: string, params: Record<string, string> = {}): Promise<T | null> {
  const base = plexServerUrl(env);
  const token = env.PLEX_TOKEN?.trim();
  if (!base || !token) return null;

  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('X-Plex-Token', token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Plex-Product': 'RushTracks',
        'X-Plex-Version': '1.0',
        'X-Plex-Client-Identifier': 'rushtracks-portal',
      },
      cf: { cacheTtl: 60, cacheEverything: false },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchPlexSectionIds(
  env: AvailabilityEnv,
  sectionKey: string,
  sectionType: 'movie' | 'show',
): Promise<Set<number>> {
  const ids = new Set<number>();
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const page = await plexGet<PlexResponse>(env, `/library/sections/${sectionKey}/all`, {
      'X-Plex-Container-Start': String(start),
      'X-Plex-Container-Size': String(PAGE_SIZE),
    });
    const container = page?.MediaContainer;
    const items = container?.Metadata ?? [];
    if (!items.length) break;

    for (const item of items) {
      for (const id of collectTmdbIds(item, sectionType)) {
        ids.add(id);
      }
    }

    total = container?.totalSize ?? items.length;
    start += items.length;
    if (items.length < PAGE_SIZE) break;
  }

  return ids;
}

async function getPlexLibraryIndex(env: AvailabilityEnv): Promise<LibraryIndex | null> {
  if (!plexConfigured(env)) return null;

  const sections = await plexGet<PlexResponse>(env, '/library/sections');
  const directories = sections?.MediaContainer?.Directory ?? [];

  const movieSections = directories.filter((d) => d.type === 'movie' && d.key);
  const showSections = directories.filter((d) => d.type === 'show' && d.key);

  const movieSets = await Promise.all(
    movieSections.map((s) => fetchPlexSectionIds(env, s.key!, 'movie')),
  );
  const showSets = await Promise.all(
    showSections.map((s) => fetchPlexSectionIds(env, s.key!, 'show')),
  );

  const movies = new Set<number>();
  const shows = new Set<number>();
  for (const set of movieSets) for (const id of set) movies.add(id);
  for (const set of showSets) for (const id of set) shows.add(id);

  return { movies, shows, expiresAt: Date.now() + INDEX_TTL_MS };
}

function jellyfinBaseUrl(env: AvailabilityEnv): string {
  return env.JELLYFIN_SERVER_URL!.replace(/\/$/, '');
}

async function jellyfinGet<T>(env: AvailabilityEnv, path: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${jellyfinBaseUrl(env)}${path.startsWith('/') ? path : `/${path}`}`);
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

async function fetchJellyfinTmdbIds(env: AvailabilityEnv, itemType: 'Movie' | 'Series'): Promise<Set<number>> {
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

async function getJellyfinLibraryIndex(env: AvailabilityEnv): Promise<LibraryIndex | null> {
  if (!jellyfinConfigured(env)) return null;

  const [movies, shows] = await Promise.all([
    fetchJellyfinTmdbIds(env, 'Movie'),
    fetchJellyfinTmdbIds(env, 'Series'),
  ]);

  return { movies, shows, expiresAt: Date.now() + INDEX_TTL_MS };
}

async function getLibraryIndex(env: AvailabilityEnv): Promise<LibraryIndex | null> {
  if (!availabilityConfigured(env)) return null;

  if (indexCache && Date.now() < indexCache.expiresAt) {
    return indexCache;
  }

  let index: LibraryIndex | null = null;

  if (plexConfigured(env)) {
    index = await getPlexLibraryIndex(env);
  }
  if (!index && jellyfinConfigured(env)) {
    index = await getJellyfinLibraryIndex(env);
  }

  if (index) {
    indexCache = index;
  }
  return index;
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
  const configured = availabilityConfigured(env);
  const index = await getLibraryIndex(env);

  if (!index) {
    return { configured, items };
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
