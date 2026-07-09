import Stripe from 'stripe';

import type { Env } from './env';

export function getStripe(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export async function createCheckoutSession(
  env: Env,
  email?: string,
): Promise<Stripe.Checkout.Session> {
  if (!env.STRIPE_PRICE_ID) {
    throw new Error('STRIPE_PRICE_ID is not configured');
  }

  const appUrl = env.PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:4321';
  const stripe = getStripe(env);

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: email || undefined,
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        product: 'rushtv-family',
      },
    },
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/cancel`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    metadata: {
      product: 'rushtv-family',
    },
  });
}

export async function retrieveCheckoutSession(
  env: Env,
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe(env);
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });
}

export async function retrieveSubscription(
  env: Env,
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe(env);
  return stripe.subscriptions.retrieve(subscriptionId);
}

export function subscriptionToRecord(
  email: string,
  customerId: string,
  subscription: Stripe.Subscription,
): import('./env').SubscriberRecord {
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
    : null;

  return {
    email,
    stripeCustomerId: customerId,
    subscriptionId: subscription.id,
    status: subscription.status as import('./env').SubscriberRecord['status'],
    trialEnd,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString(),
  };
}

export async function resolveEmailFromCustomer(
  env: Env,
  customerId: string,
  fallback?: string | null,
): Promise<string | null> {
  if (fallback) return fallback;
  const stripe = getStripe(env);
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.email ?? null;
}
