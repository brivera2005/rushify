import "server-only";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "rushify_session";

export type SessionData = {
  accessToken: string;
  userId: string;
  username: string;
  role?: "admin" | "user";
  isAdmin?: boolean;
};

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed.accessToken || !parsed.userId || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sessionCookieSecure(): boolean {
  if (process.env.SESSION_COOKIE_SECURE === "true") return true;
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  return process.env.RUSHIFY_TLS === "true";
}

export function buildSessionCookie(session: SessionData): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
} {
  return {
    name: SESSION_COOKIE,
    value: JSON.stringify(session),
    options: {
      httpOnly: true,
      secure: sessionCookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export function buildClearSessionCookie(): {
  name: string;
  value: string;
  options: { httpOnly: boolean; path: string; maxAge: number };
} {
  return {
    name: SESSION_COOKIE,
    value: "",
    options: { httpOnly: true, path: "/", maxAge: 0 },
  };
}
