import { isFreeSubscriberEmail } from './free-subscribers';
import {
  isActiveStatus,
  normalizeEmail,
  type Env,
} from './env';
import { getSubscriberByEmail } from './subscribers';

export const REFERRAL_CREDIT_CENTS = 500;
export const REFERRAL_CREDIT_CAP_CENTS = 2000;

const REFERRAL_PREFIX = 'referral:';
const REFERRER_LIST_PREFIX = 'referrer:';
const REFERRER_LIST_SUFFIX = ':referred';
const CREDIT_LEDGER_SUFFIX = ':credit-ledger';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface ReferralProfile {
  referralCode: string;
  referredBy?: string;
  activeReferralCount: number;
}

export interface ReferralStatusResponse {
  code: string;
  shareUrl: string;
  activeReferrals: number;
  monthlyCreditCents: number;
  capCents: number;
}

function referralCodeKey(code: string): string {
  return `${REFERRAL_PREFIX}${code.toUpperCase()}`;
}

function referrerListKey(email: string): string {
  return `${REFERRER_LIST_PREFIX}${normalizeEmail(email)}${REFERRER_LIST_SUFFIX}`;
}

function creditLedgerKey(email: string): string {
  return `${REFERRER_LIST_PREFIX}${normalizeEmail(email)}${CREDIT_LEDGER_SUFFIX}`;
}

function profileKey(email: string): string {
  return `subscriber:referral:${normalizeEmail(email)}`;
}

export function hashToReferralSuffix(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }

  let suffix = '';
  let n = Math.abs(hash);
  for (let i = 0; i < 4; i += 1) {
    suffix += CODE_CHARS[n % CODE_CHARS.length];
    n = Math.floor(n / CODE_CHARS.length) + seed.charCodeAt(i % seed.length);
  }
  return suffix;
}

export function buildReferralCode(seed: string, attempt = 0): string {
  const suffix =
    attempt === 0
      ? hashToReferralSuffix(seed)
      : hashToReferralSuffix(`${seed}:${attempt}`);
  return `RUSH-${suffix}`;
}

export function parseReferralCodeParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (!/^RUSH-[A-Z0-9]{4}$/.test(trimmed)) return null;
  return trimmed;
}

export async function getReferralProfile(
  env: Env,
  email: string,
): Promise<ReferralProfile | null> {
  const raw = await env.SUBSCRIBERS_KV.get(profileKey(email));
  if (!raw) return null;
  return JSON.parse(raw) as ReferralProfile;
}

async function saveReferralProfile(
  env: Env,
  email: string,
  profile: ReferralProfile,
): Promise<void> {
  await env.SUBSCRIBERS_KV.put(profileKey(email), JSON.stringify(profile));
}

export async function resolveReferralCode(
  env: Env,
  code: string,
): Promise<string | null> {
  const normalized = parseReferralCodeParam(code);
  if (!normalized) return null;
  const email = await env.SUBSCRIBERS_KV.get(referralCodeKey(normalized));
  return email ? normalizeEmail(email) : null;
}

export async function isReferralCodeValid(env: Env, code: string): Promise<boolean> {
  const email = await resolveReferralCode(env, code);
  return email !== null;
}

async function getReferredEmails(env: Env, referrerEmail: string): Promise<string[]> {
  const raw = await env.SUBSCRIBERS_KV.get(referrerListKey(referrerEmail));
  if (!raw) return [];
  const parsed = JSON.parse(raw) as string[];
  return Array.isArray(parsed) ? parsed.map(normalizeEmail) : [];
}

export async function countActiveReferrals(
  env: Env,
  referrerEmail: string,
): Promise<number> {
  const referredEmails = await getReferredEmails(env, referrerEmail);
  let count = 0;

  for (const referredEmail of referredEmails) {
    if (isFreeSubscriberEmail(env, referredEmail)) continue;
    const record = await getSubscriberByEmail(env, referredEmail);
    if (record && isActiveStatus(record.status)) {
      count += 1;
    }
  }

  return count;
}

export function calculateMonthlyCreditCents(
  activeReferrals: number,
  referrerIsLifetime: boolean,
): number {
  if (referrerIsLifetime) return 0;
  return Math.min(
    activeReferrals * REFERRAL_CREDIT_CENTS,
    REFERRAL_CREDIT_CAP_CENTS,
  );
}

export function buildShareUrl(env: Env, code: string): string {
  const appUrl = env.PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://rushtv-billing.pages.dev';
  return `${appUrl}/?ref=${encodeURIComponent(code)}`;
}

async function reserveReferralCode(
  env: Env,
  email: string,
  seed: string,
): Promise<string> {
  const normalized = normalizeEmail(email);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = buildReferralCode(seed, attempt);
    const key = referralCodeKey(code);
    const existing = await env.SUBSCRIBERS_KV.get(key);

    if (!existing || existing === normalized) {
      await env.SUBSCRIBERS_KV.put(key, normalized);
      return code;
    }
  }

  throw new Error(`Unable to allocate referral code for ${normalized}`);
}

export async function ensureReferralCode(
  env: Env,
  email: string,
  customerId?: string,
): Promise<ReferralProfile> {
  const normalized = normalizeEmail(email);
  const existing = await getReferralProfile(env, normalized);

  if (existing?.referralCode) {
    const activeReferralCount = await countActiveReferrals(env, normalized);
    const updated: ReferralProfile = { ...existing, activeReferralCount };
    if (updated.activeReferralCount !== existing.activeReferralCount) {
      await saveReferralProfile(env, normalized, updated);
    }
    return updated;
  }

  const seed = customerId ? `${normalized}:${customerId}` : normalized;
  const referralCode = await reserveReferralCode(env, normalized, seed);
  const activeReferralCount = await countActiveReferrals(env, normalized);
  const profile: ReferralProfile = {
    referralCode,
    referredBy: existing?.referredBy,
    activeReferralCount,
  };
  await saveReferralProfile(env, normalized, profile);
  return profile;
}

export async function attributeReferral(
  env: Env,
  newSubscriberEmail: string,
  referralCode: string,
): Promise<void> {
  const normalizedNew = normalizeEmail(newSubscriberEmail);
  const parsedCode = parseReferralCodeParam(referralCode);
  if (!parsedCode) return;

  const referrerEmail = await resolveReferralCode(env, parsedCode);
  if (!referrerEmail || referrerEmail === normalizedNew) return;

  const existingProfile = await getReferralProfile(env, normalizedNew);
  if (existingProfile?.referredBy) return;

  const referredList = await getReferredEmails(env, referrerEmail);
  if (!referredList.includes(normalizedNew)) {
    referredList.push(normalizedNew);
    await env.SUBSCRIBERS_KV.put(
      referrerListKey(referrerEmail),
      JSON.stringify(referredList.sort()),
    );
  }

  const newProfile: ReferralProfile = {
    referralCode: existingProfile?.referralCode ?? (await ensureReferralCode(env, normalizedNew)).referralCode,
    referredBy: parsedCode,
    activeReferralCount: existingProfile?.activeReferralCount ?? 0,
  };
  await saveReferralProfile(env, normalizedNew, newProfile);

  const referrerProfile = await ensureReferralCode(env, referrerEmail);
  const activeReferralCount = await countActiveReferrals(env, referrerEmail);
  await saveReferralProfile(env, referrerEmail, {
    ...referrerProfile,
    activeReferralCount,
  });
}

export async function refreshReferrerCounts(
  env: Env,
  referredEmail: string,
): Promise<void> {
  const profile = await getReferralProfile(env, referredEmail);
  if (!profile?.referredBy) return;

  const referrerEmail = await resolveReferralCode(env, profile.referredBy);
  if (!referrerEmail) return;

  const referrerProfile = await getReferralProfile(env, referrerEmail);
  if (!referrerProfile) return;

  const activeReferralCount = await countActiveReferrals(env, referrerEmail);
  await saveReferralProfile(env, referrerEmail, {
    ...referrerProfile,
    activeReferralCount,
  });
}

export async function getReferralStatus(
  env: Env,
  email: string,
  customerId?: string,
): Promise<ReferralStatusResponse> {
  const normalized = normalizeEmail(email);
  const profile = await ensureReferralCode(env, normalized, customerId);
  const activeReferrals = await countActiveReferrals(env, normalized);
  const referrerIsLifetime = isFreeSubscriberEmail(env, normalized);

  return {
    code: profile.referralCode,
    shareUrl: buildShareUrl(env, profile.referralCode),
    activeReferrals,
    monthlyCreditCents: calculateMonthlyCreditCents(activeReferrals, referrerIsLifetime),
    capCents: REFERRAL_CREDIT_CAP_CENTS,
  };
}

export async function recordReferralCreditAccrual(
  env: Env,
  referredEmail: string,
  amountCents = REFERRAL_CREDIT_CENTS,
): Promise<void> {
  const normalized = normalizeEmail(referredEmail);
  const profile = await getReferralProfile(env, normalized);
  if (!profile?.referredBy) return;

  const referrerEmail = await resolveReferralCode(env, profile.referredBy);
  if (!referrerEmail || isFreeSubscriberEmail(env, referrerEmail)) return;

  const record = await getSubscriberByEmail(env, normalized);
  if (!record || !isActiveStatus(record.status)) return;

  const ledgerRaw = await env.SUBSCRIBERS_KV.get(creditLedgerKey(referrerEmail));
  const ledger = ledgerRaw
    ? (JSON.parse(ledgerRaw) as { pendingCents: number; updatedAt: string })
    : { pendingCents: 0, updatedAt: new Date().toISOString() };

  ledger.pendingCents = Math.min(
    ledger.pendingCents + amountCents,
    REFERRAL_CREDIT_CAP_CENTS,
  );
  ledger.updatedAt = new Date().toISOString();
  await env.SUBSCRIBERS_KV.put(creditLedgerKey(referrerEmail), JSON.stringify(ledger));
}
