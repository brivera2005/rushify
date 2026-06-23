import "server-only";

import { getEnv, type RushifyEnv } from "@/lib/config/env";
import type { SessionData } from "@/lib/auth/session";

export type RushifyUserRole = "admin" | "user";

export type RushifyUser = {
  username: string;
  password: string;
  role: RushifyUserRole;
};

const userSchema = {
  username: (v: unknown) => typeof v === "string" && v.trim().length > 0,
  password: (v: unknown) => typeof v === "string" && v.length > 0,
  role: (v: unknown) => v === "admin" || v === "user",
};

function parseUsersJson(raw: string): RushifyUser[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is RushifyUser =>
          typeof entry === "object" &&
          entry !== null &&
          userSchema.username((entry as RushifyUser).username) &&
          userSchema.password((entry as RushifyUser).password) &&
          userSchema.role((entry as RushifyUser).role),
      )
      .map((entry) => ({
        username: entry.username.trim(),
        password: entry.password,
        role: entry.role,
      }));
  } catch {
    return [];
  }
}

export function getRushifyUsers(env: RushifyEnv = getEnv()): RushifyUser[] {
  if (env.RUSHIFY_USERS) {
    const fromJson = parseUsersJson(env.RUSHIFY_USERS);
    if (fromJson.length > 0) return fromJson;
  }

  if (env.RUSHIFY_ADMIN_USERNAME && env.RUSHIFY_ADMIN_PASSWORD) {
    return [
      {
        username: env.RUSHIFY_ADMIN_USERNAME,
        password: env.RUSHIFY_ADMIN_PASSWORD,
        role: "admin",
      },
    ];
  }

  return [];
}

export function isRushifyAuthConfigured(env: RushifyEnv = getEnv()): boolean {
  return getRushifyUsers(env).length > 0;
}

export function verifyRushifyCredentials(
  username: string,
  password: string,
  env: RushifyEnv = getEnv(),
): RushifyUser | null {
  const normalized = username.trim();
  const user = getRushifyUsers(env).find((entry) => entry.username === normalized);
  if (!user || user.password !== password) return null;
  return user;
}

export function createRushifyUserSession(user: RushifyUser): SessionData {
  const slug = user.username.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    accessToken: `rushify-${slug}`,
    userId: `rushify-${slug}`,
    username: user.username,
    role: user.role,
    isAdmin: user.role === "admin",
  };
}

export function isRushifyLocalSession(session: SessionData): boolean {
  return session.userId.startsWith("rushify-");
}

export function isAdminRole(session: SessionData): boolean {
  return session.role === "admin" || session.isAdmin === true;
}
