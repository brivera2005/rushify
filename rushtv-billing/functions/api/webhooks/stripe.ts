import Stripe from 'stripe';

import { isFreeSubscriberEmail } from '../../lib/free-subscribers';
import { jsonResponse, normalizeEmail, type Env } from '../../lib/env';
import {
  attributeReferral,
  ensureReferralCode,
  parseReferralCodeParam,
  recordReferralCreditAccrual,
  refreshReferrerCounts,
} from '../../lib/referrals';
import {
  resolveEmailFromCustomer,
  retrieveSubscription,
  subscriptionToRecord,
} from '../../lib/stripe';
import { saveSubscriber } from '../../lib/subscribers';

async function upsertFromSubscription(
  env: Env,
  subscriptionId: string,
  emailHint?: string | null,
): Promise<void> {
  const subscription = await retrieveSubscription(env, subscriptionId);
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const email = await resolveEmailFromCustomer(env, customerId, emailHint);
  if (!email) {
    console.warn('subscription without resolvable email', subscriptionId);
    return;
  }

  if (isFreeSubscriberEmail(env, normalizeEmail(email))) {
    console.info('skipping webhook upsert for lifetime subscriber', email);
    return;
  }

  await saveSubscriber(env, subscriptionToRecord(email, customerId, subscription));
  await ensureReferralCode(env, email, customerId);
  await refreshReferrerCounts(env, email);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ error: 'Webhook not configured' }, 503);
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return jsonResponse({ error: 'Missing Stripe signature' }, 400);
  }

  const payload = await request.text();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error('webhook signature verification failed', error);
    return jsonResponse({ error: 'Invalid signature' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (subscriptionId) {
          const emailHint =
            session.customer_details?.email ?? session.customer_email;
          await upsertFromSubscription(env, subscriptionId, emailHint);

          const customerId =
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id;
          const resolvedEmail = emailHint
            ? normalizeEmail(emailHint)
            : customerId
              ? await resolveEmailFromCustomer(env, customerId, null)
              : null;

          if (resolvedEmail) {
            const referralCode = parseReferralCodeParam(
              session.metadata?.referral_code,
            );
            if (referralCode) {
              await attributeReferral(env, resolvedEmail, referralCode);
            }
            if (customerId) {
              await ensureReferralCode(env, resolvedEmail, customerId);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
        const email = await resolveEmailFromCustomer(env, customerId, null);
        if (email && !isFreeSubscriberEmail(env, normalizeEmail(email))) {
          await saveSubscriber(env, subscriptionToRecord(email, customerId, subscription));
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const legacySubscription = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
        const parentSubscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof legacySubscription === 'string'
            ? legacySubscription
            : legacySubscription?.id ??
              (typeof parentSubscription === 'string' ? parentSubscription : parentSubscription?.id);

        if (subscriptionId) {
          await upsertFromSubscription(env, subscriptionId, invoice.customer_email);
        }

        if (event.type === 'invoice.paid' && invoice.customer_email) {
          await recordReferralCreditAccrual(
            env,
            normalizeEmail(invoice.customer_email),
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error('webhook handler error', event.type, error);
    return jsonResponse({ error: 'Webhook handler failed' }, 500);
  }

  return jsonResponse({ received: true });
};
