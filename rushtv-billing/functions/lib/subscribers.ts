import {
  isActiveStatus,
  normalizeEmail,
  type Env,
  type SubscriberRecord,
} from './env';
import { getFreeSubscriberEmails } from './free-subscribers';

const EMAIL_PREFIX = 'subscriber:email:';
const CUSTOMER_PREFIX = 'subscriber:customer:';
const ACTIVE_LIST_KEY = 'subscribers:active';

function emailKey(email: string): string {
  return `${EMAIL_PREFIX}${normalizeEmail(email)}`;
}

function customerKey(customerId: string): string {
  return `${CUSTOMER_PREFIX}${customerId}`;
}

export async function getSubscriberByEmail(
  env: Env,
  email: string,
): Promise<SubscriberRecord | null> {
  const raw = await env.SUBSCRIBERS_KV.get(emailKey(email));
  if (!raw) return null;
  return JSON.parse(raw) as SubscriberRecord;
}

export async function getSubscriberByCustomerId(
  env: Env,
  customerId: string,
): Promise<SubscriberRecord | null> {
  const email = await env.SUBSCRIBERS_KV.get(customerKey(customerId));
  if (!email) return null;
  return getSubscriberByEmail(env, email);
}

export async function saveSubscriber(
  env: Env,
  record: SubscriberRecord,
): Promise<void> {
  const normalized = normalizeEmail(record.email);
  const payload: SubscriberRecord = {
    ...record,
    email: normalized,
    updatedAt: new Date().toISOString(),
  };

  await env.SUBSCRIBERS_KV.put(emailKey(normalized), JSON.stringify(payload));
  await env.SUBSCRIBERS_KV.put(customerKey(record.stripeCustomerId), normalized);
  await refreshActiveList(env);
}

export async function refreshActiveList(env: Env): Promise<string[]> {
  const list = await env.SUBSCRIBERS_KV.list({ prefix: EMAIL_PREFIX });
  const activeEmails: string[] = [];

  for (const key of list.keys) {
    const raw = await env.SUBSCRIBERS_KV.get(key.name);
    if (!raw) continue;
    const record = JSON.parse(raw) as SubscriberRecord;
    if (isActiveStatus(record.status)) {
      activeEmails.push(record.email);
    }
  }

  activeEmails.sort();
  await env.SUBSCRIBERS_KV.put(ACTIVE_LIST_KEY, JSON.stringify(activeEmails));
  return activeEmails;
}

export async function getActiveSubscriberEmails(env: Env): Promise<string[]> {
  const cached = await env.SUBSCRIBERS_KV.get(ACTIVE_LIST_KEY);
  const paidActive = cached
    ? (JSON.parse(cached) as string[])
    : await refreshActiveList(env);

  const lifetime = [...getFreeSubscriberEmails(env)];
  return [...new Set([...paidActive, ...lifetime])].sort();
}

export function subscriberStatusResponse(record: SubscriberRecord | null) {
  if (!record) {
    return {
      active: false,
      status: 'none',
      email: null,
    };
  }

  return {
    active: isActiveStatus(record.status),
    status: record.status,
    email: record.email,
    trialEnd: record.trialEnd,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    updatedAt: record.updatedAt,
  };
}
