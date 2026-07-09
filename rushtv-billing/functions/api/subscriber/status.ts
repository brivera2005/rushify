import {
  isFreeSubscriberEmail,
  lifetimeSubscriberStatusResponse,
} from '../../lib/free-subscribers';
import { jsonResponse, normalizeEmail, type Env } from '../../lib/env';
import {
  getSubscriberByEmail,
  subscriberStatusResponse,
} from '../../lib/subscribers';

function authorizeRequest(request: Request, env: Env): boolean {
  const secret = env.SUBSCRIBER_API_SECRET;
  if (!secret) return true;

  const auth = request.headers.get('authorization') ?? '';
  if (auth === `Bearer ${secret}`) return true;

  const querySecret = new URL(request.url).searchParams.get('token');
  return querySecret === secret;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!authorizeRequest(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return jsonResponse(
      {
        error: 'Missing email query parameter.',
        usage: 'GET /api/subscriber/status?email=user@example.com',
        note: 'Protect with Authorization: Bearer SUBSCRIBER_API_SECRET when configured.',
      },
      400,
    );
  }

  const normalized = normalizeEmail(email);
  if (isFreeSubscriberEmail(env, normalized)) {
    return jsonResponse(lifetimeSubscriberStatusResponse(normalized));
  }

  const record = await getSubscriberByEmail(env, normalized);
  return jsonResponse(subscriberStatusResponse(record));
};
