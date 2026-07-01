import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './load-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const CACHE_PATH = join(root, 'src', 'data', 'metadata-cache.json');
const TRACKS_PATH = join(root, 'src', 'data', 'tracks.json');
const ENRICHED_PATH = join(root, 'src', 'data', 'tracks-enriched.json');
const PUBLIC_PATH = join(root, 'public', 'tracks.json');

const AFFILIATE_TAG = 'tomewizard-20';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w342';
const CONCURRENCY = 6;

loadEnv();
const TMDB_KEY = process.env.TMDB_API_KEY;

function cacheKey(item) {
  const base = `${item.type}:${item.title}:${item.author ?? ''}:${item.year ?? ''}`;
  return base.toLowerCase();
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function amazonSearchUrl(title, author) {
  const q = encodeURIComponent(author ? `${title} ${author}` : title);
  return `https://www.amazon.com/s?k=${q}&tag=${AFFILIATE_TAG}`;
}

async function tmdbFetch(path) {
  const url = `https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function cleanShowTitle(title) {
  return title
    .replace(/\s*\(Season[s]?\s*\d+[^)]*\)/gi, '')
    .replace(/\s*\(Series\)/gi, '')
    .trim();
}

async function enrichFilm(item) {
  const isShow = item.type === 'show';
  const isDoc = item.type === 'documentary';
  const query = isShow ? cleanShowTitle(item.title) : item.title;
  const mediaPath = isShow ? 'tv' : 'movie';
  const search = await tmdbFetch(
    `/search/${mediaPath}?query=${encodeURIComponent(query)}${item.year ? `&year=${item.year}` : ''}`,
  );
  const hit = search?.results?.[0];
  if (!hit) return { amazonUrl: amazonSearchUrl(item.title, item.author) };

  const detail = await tmdbFetch(`/${mediaPath}/${hit.id}`);
  const posterPath = hit.poster_path || detail?.poster_path;
  const rating = hit.vote_average ?? detail?.vote_average;
  const ratingCount = hit.vote_count ?? detail?.vote_count;
  const genres = (detail?.genres ?? []).map((g) => g.name);
  const overview = detail?.overview || hit.overview;

  return {
    posterUrl: posterPath ? `${TMDB_IMAGE}${posterPath}` : undefined,
    overview: overview || undefined,
    genres: genres.length ? genres : undefined,
    rating: rating ? Math.round(rating * 10) / 10 : undefined,
    ratingCount: ratingCount || undefined,
    tmdbId: hit.id,
    mediaType: mediaPath,
    year: (hit.release_date || hit.first_air_date || '').slice(0, 4) || item.year,
  };
}

async function enrichBook(item) {
  const params = new URLSearchParams({ title: item.title, limit: '3' });
  if (item.author) params.set('author', item.author);
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  const data = res.ok ? await res.json() : null;
  const doc = data?.docs?.[0];
  const coverId = doc?.cover_i;
  const coverUrl = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
    : undefined;

  return {
    coverUrl,
    openLibraryKey: doc?.key,
    overview: doc?.first_sentence?.[0] || undefined,
    year: doc?.first_publish_year || item.year,
    amazonUrl: amazonSearchUrl(item.title, item.author),
  };
}

async function enrichItem(item, cache) {
  const key = cacheKey(item);
  if (cache[key]) return cache[key];

  let meta = {};
  try {
    if (item.type === 'book') {
      meta = await enrichBook(item);
    } else if (['movie', 'show', 'documentary'].includes(item.type)) {
      if (TMDB_KEY) {
        meta = await enrichFilm(item);
      } else {
        meta = {};
      }
      if (!meta.amazonUrl && item.type === 'book') {
        meta.amazonUrl = amazonSearchUrl(item.title, item.author);
      }
    } else {
      meta = { amazonUrl: amazonSearchUrl(item.title, item.author) };
    }
  } catch (err) {
    console.warn(`enrich failed for ${item.title}:`, err.message);
  }

  if (item.type === 'book' && !meta.amazonUrl) {
    meta.amazonUrl = amazonSearchUrl(item.title, item.author);
  }

  cache[key] = meta;
  return meta;
}

async function pool(items, worker, limit) {
  const results = new Array(items.length);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, run));
  return results;
}

function stripMetadata(track) {
  const stripItem = ({ metadata, ...rest }) => rest;
  return {
    ...track,
    sequence: track.sequence.map(stripItem),
    supplemental: track.supplemental?.map(stripItem),
  };
}

function enrichItems(items, cache) {
  return (items || []).map((item) => {
    const meta = cache[cacheKey(item)];
    return meta ? { ...item, metadata: meta } : { ...item };
  });
}

async function main() {
  const tracks = JSON.parse(readFileSync(TRACKS_PATH, 'utf8'));
  const cache = loadCache();
  const allItems = [];
  for (const track of tracks) {
    for (const item of track.sequence) allItems.push(item);
    for (const item of track.supplemental ?? []) allItems.push(item);
  }

  console.log(`Enriching ${allItems.length} items${TMDB_KEY ? '' : ' (no TMDB_API_KEY, books only)'}`);

  await pool(
    allItems,
    async (item) => {
      await enrichItem(item, cache);
    },
    CONCURRENCY,
  );

  saveCache(cache);

  const enriched = tracks.map((track) => ({
    ...track,
    sequence: enrichItems(track.sequence, cache),
    supplemental: track.supplemental ? enrichItems(track.supplemental, cache) : undefined,
  }));

  writeFileSync(ENRICHED_PATH, JSON.stringify(enriched, null, 2));

  const publicTracks = enriched.map(stripMetadata);
  writeFileSync(PUBLIC_PATH, JSON.stringify(publicTracks, null, 2));

  const TVMEDIAHUB_PATH = join('C:', 'Users', 'Benjamin', 'Projects', 'tv-media-hub', 'app', 'src', 'main', 'assets', 'tracks', 'tracks.json');
  if (existsSync(TVMEDIAHUB_PATH)) {
    writeFileSync(TVMEDIAHUB_PATH, JSON.stringify(publicTracks, null, 2));
    console.log(`Synced ${TVMEDIAHUB_PATH}`);
  }

  console.log(`Wrote ${ENRICHED_PATH}`);
  console.log(`Wrote ${PUBLIC_PATH}`);
  console.log(`Cache entries: ${Object.keys(cache).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
