import "server-only";

import { randomBytes } from "crypto";

import type { StreamQuality } from "@/lib/jellyfin/stream";

export type CastStreamKind = "iptv" | "vod";

export type CastTokenPayload = {
  kind: CastStreamKind;
  id: string;
  quality?: StreamQuality;
  expiresAt: number;
};

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, CastTokenPayload>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [key, payload] of store) {
    if (payload.expiresAt <= now) store.delete(key);
  }
}

export function createCastToken(
  kind: CastStreamKind,
  id: string,
  quality?: StreamQuality,
): string {
  purgeExpired();
  const token = randomBytes(24).toString("base64url");
  store.set(token, { kind, id, quality, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function resolveCastToken(token: string): CastTokenPayload | null {
  purgeExpired();
  const payload = store.get(token);
  if (!payload || payload.expiresAt <= Date.now()) {
    store.delete(token);
    return null;
  }
  return payload;
}

export const CAST_TOKEN_TTL_SECONDS = TTL_MS / 1000;
