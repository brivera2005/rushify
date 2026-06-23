import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { gunzip, gzip } from "zlib";
import { promisify } from "util";

import { getEnvOrNull } from "@/lib/config/env";
import type { CacheEntry } from "@/lib/cache/memory-cache";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export type DiskCachePayload<T> = {
  value: T;
  createdAt: number;
  staleAt: number;
  expiresAt: number;
};

const DEFAULT_CACHE_DIR = "/app/cache";

function getCacheDir(): string {
  const env = getEnvOrNull();
  return env?.RUSHIFY_CACHE_DIR?.trim() || process.env.RUSHIFY_CACHE_DIR?.trim() || DEFAULT_CACHE_DIR;
}

function filePath(name: string): string {
  return join(getCacheDir(), `${name}.json.gz`);
}

async function ensureCacheDir(): Promise<void> {
  await mkdir(getCacheDir(), { recursive: true });
}

export async function readDiskCache<T>(name: string): Promise<DiskCachePayload<T> | null> {
  try {
    const compressed = await readFile(filePath(name));
    const raw = await gunzipAsync(compressed);
    const parsed = JSON.parse(raw.toString("utf8")) as DiskCachePayload<T>;

    if (
      typeof parsed.createdAt !== "number" ||
      typeof parsed.staleAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.value === undefined
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function writeDiskCache<T>(name: string, entry: CacheEntry<T>): Promise<void> {
  try {
    await ensureCacheDir();
    const payload: DiskCachePayload<T> = {
      value: entry.value,
      createdAt: entry.createdAt,
      staleAt: entry.staleAt,
      expiresAt: entry.expiresAt,
    };
    const compressed = await gzipAsync(Buffer.from(JSON.stringify(payload), "utf8"));
    await writeFile(filePath(name), compressed);
  } catch (error) {
    console.error(`[rushify] Failed to write disk cache (${name}):`, error);
  }
}

export function getDiskCacheDir(): string {
  return getCacheDir();
}
