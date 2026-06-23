import { NextRequest, NextResponse } from "next/server";

import {
  checkLoginRateLimit,
  isIpBanned,
  recordFailedLogin,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limit";
import {
  createRushifyUserSession,
  isRushifyAuthConfigured,
  verifyRushifyCredentials,
} from "@/lib/auth/rushify-users";
import { authenticateWithMediaServer } from "@/lib/auth/jellyfin-auth";
import { buildSessionCookie } from "@/lib/auth/session";
import { getEnvOrNull } from "@/lib/config/env";
import { resolveJellyfinServerUrl } from "@/lib/jellyfin/discovery";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = clientIp(request);

  const ban = isIpBanned(ip);
  if (ban.banned) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${ban.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const rate = checkLoginRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rate.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: {
    username?: string;
    password?: string;
    Username?: string;
    Password?: string;
  };

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as typeof body;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      body = {
        username: String(form.get("username") ?? form.get("Username") ?? ""),
        password: String(form.get("password") ?? form.get("Password") ?? ""),
      };
    } else {
      const raw = await request.text();
      body = raw ? (JSON.parse(raw) as typeof body) : {};
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = (body.username ?? body.Username)?.trim();
  const password = body.password ?? body.Password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const env = getEnvOrNull();
  if (env && isRushifyAuthConfigured(env)) {
    const rushifyUser = verifyRushifyCredentials(username, password, env);
    if (!rushifyUser) {
      recordFailedLogin(ip);
    }
    if (rushifyUser) {
      resetLoginRateLimit(ip);
      const session = createRushifyUserSession(rushifyUser);
      const response = NextResponse.json({
        user: { id: session.userId, username: session.username, role: session.role },
        isAdmin: session.role === "admin",
      });
      const cookie = buildSessionCookie(session);
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    }
  }

  const serverUrl = await resolveJellyfinServerUrl();
  if (!serverUrl) {
    if (env && isRushifyAuthConfigured(env)) {
      recordFailedLogin(ip);
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
    return NextResponse.json({ error: "Rushify is temporarily unavailable" }, { status: 503 });
  }

  try {
    const session = await authenticateWithMediaServer(username, password);
    resetLoginRateLimit(ip);
    const response = NextResponse.json({
      user: { id: session.userId, username: session.username, role: "user" as const },
      isAdmin: false,
    });
    const cookie = buildSessionCookie(session);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed";
    const status = message === "Invalid username or password" ? 401 : 503;
    if (status === 401) {
      recordFailedLogin(ip);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
