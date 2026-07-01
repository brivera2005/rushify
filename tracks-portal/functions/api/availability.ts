import { jsonResponse, type Env } from '../lib/gate';
import { resolveAvailability } from '../lib/availability';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const idsParam = url.searchParams.get('ids') ?? url.searchParams.get('tmdb') ?? '';
  const refs = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!refs.length) {
    return jsonResponse({ error: 'Provide ids=movie:603,tv:1399' }, 400);
  }

  if (refs.length > 40) {
    return jsonResponse({ error: 'Too many ids (max 40)' }, 400);
  }

  const result = await resolveAvailability(context.env, refs);
  return jsonResponse(result, 200, {
    'cache-control': 'private, max-age=120',
  });
};
