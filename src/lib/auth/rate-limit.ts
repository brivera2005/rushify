type Bucket = {
  count: number;
  resetAt: number;
  lastSuccessAt?: number;
};

const loginBuckets = new Map<string, Bucket>();
const apiBuckets = new Map<string, Bucket>();
const searchBuckets = new Map<string, Bucket>();
const epgRefreshBuckets = new Map<string, Bucket>();
const channelsRefreshBuckets = new Map<string, Bucket>();
const failedLoginCounts = new Map<string, { count: number; firstAt: number }>();
const bannedIps = new Map<string, number>();

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60_000;
/** Safety net for abusive traffic — normal browsing is exempt in middleware. */
const API_MAX_REQUESTS = 2000;
const API_WINDOW_MS = 60_000;
const SEARCH_MAX_REQUESTS = 10;
const SEARCH_WINDOW_MS = 60_000;
import {
  IPTV_CHANNELS_ADMIN_WINDOW_MS,
  IPTV_CHANNELS_REFRESH_WINDOW_MS,
  IPTV_EPG_ADMIN_WINDOW_MS,
  IPTV_EPG_REFRESH_WINDOW_MS,
} from "@/lib/iptv/refresh-cooldown";

const EPG_REFRESH_MAX = 1;
const CHANNELS_REFRESH_MAX = 1;
const FAILED_LOGINS_BEFORE_BAN = 10;
const IP_BAN_MS = 15 * 60_000;
const FAILED_LOGIN_RESET_MS = 60 * 60_000;

export type IptvRefreshLimitType = "epg" | "channels" | "all";

export type IptvRefreshRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
  lastRefreshAgeSeconds?: number;
  limitedType?: "epg" | "channels";
};

function pruneBucket(map: Map<string, Bucket>, key: string, now: number): Bucket {
  const existing = map.get(key);
  if (!existing || now >= existing.resetAt) {
    const bucket = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    map.set(key, bucket);
    return bucket;
  }
  return existing;
}

function getRefreshWindowMs(type: "epg" | "channels", isAdmin: boolean): number {
  if (type === "epg") {
    return isAdmin ? IPTV_EPG_ADMIN_WINDOW_MS : IPTV_EPG_REFRESH_WINDOW_MS;
  }
  return isAdmin ? IPTV_CHANNELS_ADMIN_WINDOW_MS : IPTV_CHANNELS_REFRESH_WINDOW_MS;
}

function getRefreshMax(type: "epg" | "channels"): number {
  return type === "epg" ? EPG_REFRESH_MAX : CHANNELS_REFRESH_MAX;
}

function checkSingleRefreshLimit(
  map: Map<string, Bucket>,
  userKey: string,
  type: "epg" | "channels",
  isAdmin: boolean,
  now: number,
): IptvRefreshRateLimitResult {
  const windowMs = getRefreshWindowMs(type, isAdmin);
  const existing = map.get(userKey);
  const bucket =
    !existing || now >= existing.resetAt
      ? { count: 0, resetAt: now + windowMs, lastSuccessAt: existing?.lastSuccessAt }
      : existing;

  const lastRefreshAgeSeconds =
    bucket.lastSuccessAt != null
      ? Math.max(0, Math.floor((now - bucket.lastSuccessAt) / 1000))
      : undefined;

  if (bucket.count >= getRefreshMax(type)) {
    map.set(userKey, bucket);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      lastRefreshAgeSeconds,
      limitedType: type,
    };
  }

  return { allowed: true, lastRefreshAgeSeconds };
}

function recordRefreshSuccess(
  map: Map<string, Bucket>,
  userKey: string,
  type: "epg" | "channels",
  isAdmin: boolean,
  now: number,
): void {
  const windowMs = getRefreshWindowMs(type, isAdmin);
  const existing = map.get(userKey);
  map.set(userKey, {
    count: (existing && now < existing.resetAt ? existing.count : 0) + 1,
    resetAt: existing && now < existing.resetAt ? existing.resetAt : now + windowMs,
    lastSuccessAt: now,
  });
}

export function isIpBanned(key: string): { banned: boolean; retryAfterSeconds?: number } {
  const until = bannedIps.get(key);
  if (!until) return { banned: false };

  const now = Date.now();
  if (now >= until) {
    bannedIps.delete(key);
    return { banned: false };
  }

  return {
    banned: true,
    retryAfterSeconds: Math.ceil((until - now) / 1000),
  };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const entry = failedLoginCounts.get(key);

  if (!entry || now - entry.firstAt > FAILED_LOGIN_RESET_MS) {
    failedLoginCounts.set(key, { count: 1, firstAt: now });
    return;
  }

  entry.count += 1;
  if (entry.count >= FAILED_LOGINS_BEFORE_BAN) {
    bannedIps.set(key, now + IP_BAN_MS);
    failedLoginCounts.delete(key);
    loginBuckets.delete(key);
  }
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const ban = isIpBanned(key);
  if (ban.banned) {
    return { allowed: false, retryAfterSeconds: ban.retryAfterSeconds };
  }

  const now = Date.now();
  const bucket = pruneBucket(loginBuckets, key, now);

  if (bucket.count >= LOGIN_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(key: string): void {
  loginBuckets.delete(key);
  failedLoginCounts.delete(key);
  bannedIps.delete(key);
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
  action?: string;
};

export function isBrowsingApiPath(pathname: string): boolean {
  if (pathname.startsWith("/api/jellyfin/") && pathname.includes("/Images/")) {
    return true;
  }
  if (pathname.startsWith("/api/library/")) return true;
  if (pathname === "/api/iptv/channels" || pathname === "/api/iptv/epg") {
    return true;
  }
  if (pathname.startsWith("/api/iptv/status")) return true;
  if (pathname.startsWith("/api/jellyfin/status")) return true;
  if (pathname.startsWith("/api/cast/")) return true;
  if (pathname.startsWith("/api/stream/")) return true;
  if (pathname === "/api/user/prefs") return true;
  if (pathname === "/api/auth/me" || pathname === "/api/auth/config") return true;
  if (pathname === "/api/health") return true;
  return false;
}

export function checkApiRateLimit(key: string): RateLimitResult {
  const ban = isIpBanned(key);
  if (ban.banned) {
    return {
      allowed: false,
      retryAfterSeconds: ban.retryAfterSeconds,
      action: "login",
    };
  }

  const now = Date.now();
  const existing = apiBuckets.get(key);
  const bucket =
    !existing || now >= existing.resetAt
      ? { count: 0, resetAt: now + API_WINDOW_MS }
      : existing;

  if (bucket.count >= API_MAX_REQUESTS) {
    apiBuckets.set(key, bucket);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      action: "api",
    };
  }

  bucket.count += 1;
  apiBuckets.set(key, bucket);
  return { allowed: true };
}

export function checkSearchRateLimit(userKey: string): RateLimitResult {
  const now = Date.now();
  const existing = searchBuckets.get(userKey);
  const bucket =
    !existing || now >= existing.resetAt
      ? { count: 0, resetAt: now + SEARCH_WINDOW_MS }
      : existing;

  if (bucket.count >= SEARCH_MAX_REQUESTS) {
    searchBuckets.set(userKey, bucket);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      action: "search",
    };
  }

  bucket.count += 1;
  searchBuckets.set(userKey, bucket);
  return { allowed: true };
}

export function checkIptvRefreshRateLimit(
  userKey: string,
  type: IptvRefreshLimitType,
  options?: { isAdmin?: boolean },
): IptvRefreshRateLimitResult {
  const isAdmin = options?.isAdmin ?? false;
  const now = Date.now();
  const types: Array<"epg" | "channels"> =
    type === "all" ? ["epg", "channels"] : [type];

  let blocked: IptvRefreshRateLimitResult | null = null;

  for (const refreshType of types) {
    const map = refreshType === "epg" ? epgRefreshBuckets : channelsRefreshBuckets;
    const result = checkSingleRefreshLimit(map, userKey, refreshType, isAdmin, now);
    if (!result.allowed) {
      if (
        !blocked ||
        (result.retryAfterSeconds ?? 0) > (blocked.retryAfterSeconds ?? 0)
      ) {
        blocked = result;
      }
    }
  }

  if (blocked) return blocked;
  return { allowed: true };
}

export function recordIptvRefreshSuccess(
  userKey: string,
  type: IptvRefreshLimitType,
  options?: { isAdmin?: boolean },
): void {
  const isAdmin = options?.isAdmin ?? false;
  const now = Date.now();
  const types: Array<"epg" | "channels"> =
    type === "all" ? ["epg", "channels"] : [type];

  for (const refreshType of types) {
    const map = refreshType === "epg" ? epgRefreshBuckets : channelsRefreshBuckets;
    recordRefreshSuccess(map, userKey, refreshType, isAdmin, now);
  }
}
