import {
  isFreeSubscriberEmail,
  lifetimeCheckoutResponse,
} from '../lib/free-subscribers';
import { createCheckoutSession } from '../lib/stripe';
import { jsonResponse, normalizeEmail, type Env } from '../lib/env';

interface CheckoutBody {
  email?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return jsonResponse({ error: 'Billing is not configured yet.' }, 503);
  }

  let body: CheckoutBody = {};
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      body = (await request.json()) as CheckoutBody;
    }
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const email = body.email?.trim() || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }

  if (email && isFreeSubscriberEmail(env, normalizeEmail(email))) {
    return jsonResponse(lifetimeCheckoutResponse(env));
  }

  try {
    const session = await createCheckoutSession(env, email);
    if (!session.url) {
      return jsonResponse({ error: 'Unable to start checkout.' }, 500);
    }
    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('checkout session error', error);
    return jsonResponse({ error: 'Unable to start checkout. Try again shortly.' }, 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return jsonResponse({ error: 'Billing is not configured yet.' }, 503);
  }

  const url = new URL(request.url);
  const emailParam = url.searchParams.get('email')?.trim() || undefined;
  if (emailParam && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }

  if (emailParam && isFreeSubscriberEmail(env, normalizeEmail(emailParam))) {
    return Response.redirect(lifetimeCheckoutResponse(env).url, 303);
  }

  try {
    const session = await createCheckoutSession(env, emailParam);
    if (!session.url) {
      return jsonResponse({ error: 'Unable to start checkout.' }, 500);
    }
    return Response.redirect(session.url, 303);
  } catch (error) {
    console.error('checkout redirect error', error);
    return jsonResponse({ error: 'Unable to start checkout.' }, 500);
  }
};
