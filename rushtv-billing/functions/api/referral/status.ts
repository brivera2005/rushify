import { authorizeSubscriberApi } from '../../lib/auth';
import { isFreeSubscriberEmail } from '../../lib/free-subscribers';
import { jsonResponse, normalizeEmail, type Env } from '../../lib/env';
import { getReferralStatus } from '../../lib/referrals';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!authorizeSubscriberApi(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return jsonResponse(
      {
        error: 'Missing email query parameter.',
        usage: 'GET /api/referral/status?email=user@example.com',
        note: 'Protect with Authorization: Bearer SUBSCRIBER_API_SECRET when configured.',
      },
      400,
    );
  }

  const normalized = normalizeEmail(email);
  const status = await getReferralStatus(
    env,
    normalized,
    isFreeSubscriberEmail(env, normalized) ? `lifetime:${normalized}` : undefined,
  );

  return jsonResponse(status);
};
