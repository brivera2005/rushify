import { describe, expect, it } from 'vitest';

import {
  REFERRAL_CREDIT_CAP_CENTS,
  REFERRAL_CREDIT_CENTS,
  buildReferralCode,
  calculateMonthlyCreditCents,
  hashToReferralSuffix,
  parseReferralCodeParam,
} from './referrals';

describe('parseReferralCodeParam', () => {
  it('accepts valid RUSH codes', () => {
    expect(parseReferralCodeParam('rush-ab12')).toBe('RUSH-AB12');
    expect(parseReferralCodeParam(' RUSH-9K3P ')).toBe('RUSH-9K3P');
  });

  it('rejects invalid formats', () => {
    expect(parseReferralCodeParam('')).toBeNull();
    expect(parseReferralCodeParam('RUSH-ABC')).toBeNull();
    expect(parseReferralCodeParam('PROMO-AB12')).toBeNull();
    expect(parseReferralCodeParam(null)).toBeNull();
  });
});

describe('buildReferralCode', () => {
  it('is deterministic for the same seed', () => {
    const seed = 'family@example.com:cus_123';
    expect(buildReferralCode(seed)).toBe(buildReferralCode(seed));
    expect(buildReferralCode(seed)).toMatch(/^RUSH-[A-Z0-9]{4}$/);
  });

  it('changes when attempt increments', () => {
    const seed = 'family@example.com';
    expect(buildReferralCode(seed, 0)).not.toBe(buildReferralCode(seed, 1));
  });
});

describe('hashToReferralSuffix', () => {
  it('returns four safe characters', () => {
    const suffix = hashToReferralSuffix('test-seed');
    expect(suffix).toMatch(/^[A-Z0-9]{4}$/);
    expect(suffix).not.toMatch(/[IO01]/);
  });
});

describe('calculateMonthlyCreditCents', () => {
  it('applies per-referral credit with cap', () => {
    expect(calculateMonthlyCreditCents(0, false)).toBe(0);
    expect(calculateMonthlyCreditCents(1, false)).toBe(REFERRAL_CREDIT_CENTS);
    expect(calculateMonthlyCreditCents(3, false)).toBe(1500);
    expect(calculateMonthlyCreditCents(5, false)).toBe(REFERRAL_CREDIT_CAP_CENTS);
  });

  it('returns zero for lifetime referrers', () => {
    expect(calculateMonthlyCreditCents(4, true)).toBe(0);
  });
});
