import "server-only";

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { join } from "path";

import { getEnvOrNull } from "@/lib/config/env";
import { DEFAULT_USER_PREFS, type UserPrefs } from "@/types/user-prefs";

const DEFAULT_DATA_DIR = "/app/data";

function getDataDir(): string {
  const env = getEnvOrNull();
  return env?.RUSHIFY_DATA_DIR?.trim() || process.env.RUSHIFY_DATA_DIR?.trim() || DEFAULT_DATA_DIR;
}

function prefsDir(): string {
  return join(getDataDir(), "user-prefs");
}

function prefsPath(username: string): string {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
  return join(prefsDir(), `${safe}.json`);
}

function normalizePrefs(raw: unknown): UserPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_USER_PREFS };

  const hiddenCategories = (raw as UserPrefs).hiddenCategories;
  if (!Array.isArray(hiddenCategories)) return { ...DEFAULT_USER_PREFS };

  return {
    hiddenCategories: [
      ...new Set(hiddenCategories.filter((entry) => typeof entry === "string" && entry.trim())),
    ],
  };
}

async function ensurePrefsDir(): Promise<void> {
  await mkdir(prefsDir(), { recursive: true });
}

export async function readUserPrefs(username: string): Promise<UserPrefs> {
  try {
    const raw = await readFile(prefsPath(username), "utf8");
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_USER_PREFS };
  }
}

export async function writeUserPrefs(username: string, prefs: UserPrefs): Promise<UserPrefs> {
  await ensurePrefsDir();
  const normalized = normalizePrefs(prefs);
  const target = prefsPath(username);
  const tmp = `${target}.tmp.${process.pid}`;
  const payload = JSON.stringify(normalized, null, 2);

  try {
    await writeFile(tmp, payload, { encoding: "utf8", mode: 0o644 });
    await rename(tmp, target);
  } catch (error) {
    try {
      await writeFile(target, payload, { encoding: "utf8", mode: 0o644 });
    } catch {
      throw error;
    }
  }

  return normalized;
}

export function getUserPrefsDir(): string {
  return prefsDir();
}
