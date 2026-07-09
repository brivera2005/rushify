import { normalizeEmail, type Env } from './env';

/** Hardcoded lifetime access — never charged, always active. */
export const DEFAULT_FREE_SUBSCRIBER_EMAILS = [
  'brivera2005@gmail.com',
  'riverastreams@gmail.com',
  'ranchorivera@gmail.com',
  'clearbillingservices@gmail.com',
  'aloofluffa@gmail.com',
] as const;

export function getFreeSubscriberEmails(env: Env): Set<string> {
  const fromEnv =
    env.FREE_SUBSCRIBER_EMAILS?.split(',')
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean) ?? [];

  const emails = new Set<string>(
    DEFAULT_FREE_SUBSCRIBER_EMAILS.map((email) => normalizeEmail(email)),
  );
  for (const email of fromEnv) {
    emails.add(email);
  }
  return emails;
}

export function isFreeSubscriberEmail(env: Env, email: string): boolean {
  return getFreeSubscriberEmails(env).has(normalizeEmail(email));
}

export function lifetimeSubscriberStatusResponse(email: string) {
  return {
    active: true,
    plan: 'lifetime' as const,
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
