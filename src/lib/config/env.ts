import "server-only";
import { z } from "zod";

const envSchema = z.object({
  JELLYFIN_SERVER_URL: z.string().url().optional(),
  JELLYFIN_API_KEY: z.string().min(1).optional(),
  IPTV_M3U_URL: z.string().url().optional(),
  IPTV_EPG_URL: z.string().url().optional(),
  IPTV_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  IPTV_STALE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  IPTV_REFRESH_INTERVAL_SECONDS: z.coerce.number().int().positive().default(600),
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

export function isJellyfinConfigured(env: RushifyEnv = getEnv()): boolean {
  return Boolean(env.JELLYFIN_SERVER_URL && env.JELLYFIN_API_KEY);
}

export function isIptvConfigured(env: RushifyEnv = getEnv()): boolean {
  return Boolean(env.IPTV_M3U_URL);
}
