import { jsonResponse, type Env } from '../../lib/env';
import { isReferralCodeValid, parseReferralCodeParam } from '../../lib/referrals';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = parseReferralCodeParam(url.searchParams.get('code') ?? url.searchParams.get('ref'));

  if (!code) {
    return jsonResponse({ valid: false, error: 'Invalid referral code format' }, 400);
  }

  const valid = await isReferralCodeValid(context.env, code);
  return jsonResponse({ valid, code });
};
