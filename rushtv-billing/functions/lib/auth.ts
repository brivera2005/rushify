import type { Env } from './env';

export function authorizeSubscriberApi(request: Request, env: Env): boolean {
  const secret = env.SUBSCRIBER_API_SECRET;
  if (!secret) return true;

  const auth = request.headers.get('authorization') ?? '';
  if (auth === `Bearer ${secret}`) return true;

  const querySecret = new URL(request.url).searchParams.get('token');
  return querySecret === secret;
}
