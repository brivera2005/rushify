import { normalizeEmail, type Env } from './env';

export function getFreeSubscriberEmails(env: Env): Set<string> {
  const fromEnv =
    env.FREE_SUBSCRIBER_EMAILS?.split(',')
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean) ?? [];

  return new Set(fromEnv);
}

export function isFreeSubscriberEmail(env: Env, email: string): boolean {
  return getFreeSubscriberEmails(env).has(normalizeEmail(email));
}

export function lifetimeSubscriberStatusResponse(email: string) {
  return {
    active: true,
    plan: 'lifetime' as const,
    status: 'active',
    trial: false,
    email: normalizeEmail(email),
  };
}

export function lifetimeCheckoutResponse(env: Env) {
  const appUrl = env.PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  return {
    lifetimeAccess: true,
    message: 'You already have lifetime access',
    url: `${appUrl}/success?lifetime=1`,
  };
}
