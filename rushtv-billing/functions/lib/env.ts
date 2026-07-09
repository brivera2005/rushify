export interface Env {
  SUBSCRIBERS_KV: KVNamespace;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;
  PUBLIC_APP_URL: string;
  STRIPE_STATEMENT_DESCRIPTOR?: string;
  SUBSCRIBER_API_SECRET?: string;
  /** Comma-separated extra lifetime emails (merged with hardcoded allowlist). */
  FREE_SUBSCRIBER_EMAILS?: string;
}

export interface SubscriberRecord {
  email: string;
  stripeCustomerId: string;
  subscriptionId: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isActiveStatus(status: string): boolean {
  return status === 'active' || status === 'trialing';
}
