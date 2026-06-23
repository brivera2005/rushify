import "server-only";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional(),
);

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  RUSHIFY_USERS: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional(),
  ),
  RUSHIFY_ADMIN_USERNAME: optionalNonEmptyString,
  RUSHIFY_ADMIN_PASSWORD: optionalNonEmptyString,
  RUSHIFY_TLS: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(false),
  /** Optional PIN gate before login (recommended when port-forwarding). */
  RUSHIFY_ACCESS_PIN: optionalNonEmptyString,
  /** Public URL clients use to reach Rushify (remote access). Falls back to NEXT_PUBLIC_APP_URL. */
  RUSHIFY_PUBLIC_URL: optionalUrl,
  JELLYFIN_SERVER_URL: optionalUrl,
  JELLYFIN_API_KEY: optionalNonEmptyString,
  GEMINI_API_KEY: optionalNonEmptyString,
  JELLYFIN_DISCOVERY_URLS: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional(),
  ),
  /** auto = Jellyfin Live TV first, then direct provider fallback */
  IPTV_BACKEND: z.enum(["auto", "jellyfin", "direct"]).default("auto"),
  IPTV_XTREAM_URL: optionalUrl,
  IPTV_XTREAM_USERNAME: optionalNonEmptyString,
  IPTV_XTREAM_PASSWORD: optionalNonEmptyString,
  IPTV_M3U_URL: optionalUrl,
  IPTV_EPG_URL: optionalUrl,
  IPTV_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  IPTV_STALE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  IPTV_EPG_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  IPTV_EPG_STALE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  IPTV_REFRESH_INTERVAL_SECONDS: z.coerce.number().int().positive().default(600),
  IPTV_EPG_REFRESH_INTERVAL_SECONDS: z.coerce.number().int().positive().default(1800),
  RUSHIFY_CACHE_DIR: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  RUSHIFY_DATA_DIR: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  IPTV_ENGLISH_ONLY: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(true),
  /** When true, only US region categories/channels are returned (stricter than English-only). */
  IPTV_US_ONLY: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(true),
  /** When true, HLS media segments load directly from CDN (manifest still proxied). */
  IPTV_DIRECT_SEGMENTS: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(false),
  IPTV_UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  /** Abort live tune if first segment/manifest not ready in time (ms). */
  IPTV_MAX_SEGMENT_WAIT_MS: z.coerce.number().int().positive().default(6000),
  /** Initial connection timeout for dead channels (ms). */
  IPTV_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  SESSION_COOKIE_SECURE: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(false),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type RushifyEnv = z.infer<typeof envSchema>;

let cachedEnv: RushifyEnv | null = null;

export function getEnv(): RushifyEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

export function getEnvOrNull(): RushifyEnv | null {
  const parsed = envSchema.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}

export function isAdminAuthConfigured(env: RushifyEnv = getEnv()): boolean {
  if (env.RUSHIFY_USERS) {
    try {
      const users = JSON.parse(env.RUSHIFY_USERS) as Array<{ role?: string }>;
      if (Array.isArray(users) && users.some((user) => user.role === "admin")) {
        return true;
      }
    } catch {
      // fall through to legacy admin vars
    }
  }
  return Boolean(env.RUSHIFY_ADMIN_USERNAME && env.RUSHIFY_ADMIN_PASSWORD);
}

export function isJellyfinConfigured(env: RushifyEnv = getEnv()): boolean {
  return Boolean(env.JELLYFIN_SERVER_URL && env.JELLYFIN_API_KEY);
}

export function isDirectIptvConfigured(env: RushifyEnv = getEnv()): boolean {
  return Boolean(
    env.IPTV_M3U_URL ||
      (env.IPTV_XTREAM_URL && env.IPTV_XTREAM_USERNAME && env.IPTV_XTREAM_PASSWORD),
  );
}

export function isIptvConfigured(env: RushifyEnv = getEnv()): boolean {
  if (env.IPTV_BACKEND === "jellyfin") {
    return isJellyfinConfigured(env);
  }
  if (env.IPTV_BACKEND === "direct") {
    return isDirectIptvConfigured(env);
  }
  return isJellyfinConfigured(env) || isDirectIptvConfigured(env);
}

export function prefersJellyfinLiveTv(env: RushifyEnv = getEnv()): boolean {
  return env.IPTV_BACKEND === "jellyfin" || env.IPTV_BACKEND === "auto";
}

export function allowsDirectIptvFallback(env: RushifyEnv = getEnv()): boolean {
  return env.IPTV_BACKEND === "direct" || env.IPTV_BACKEND === "auto";
}

export function isXtreamConfigured(env: RushifyEnv = getEnv()): boolean {
  return Boolean(env.IPTV_XTREAM_URL && env.IPTV_XTREAM_USERNAME && env.IPTV_XTREAM_PASSWORD);
}
