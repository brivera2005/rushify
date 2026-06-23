import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ACCESS_GATE_COOKIE,
  hasValidAccessGateCookie,
  isAccessGateEnabled,
} from "@/lib/auth/access-gate";
import { checkApiRateLimit, isBrowsingApiPath, isIpBanned } from "@/lib/auth/rate-limit";
import { isAdminRole } from "@/lib/auth/rushify-users";
import { SESSION_COOKIE, type SessionData } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/gate", "/legal", "/support", "/terms"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/health", "/api/stream/cast"];

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function parseSession(request: NextRequest): SessionData | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed.accessToken || !parsed.userId || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

function gateRedirect(request: NextRequest): NextResponse {
  const gateUrl = new URL("/gate", request.url);
  gateUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(gateUrl);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = clientIp(request);

  const ban = isIpBanned(ip);
  if (ban.banned && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: `Access temporarily blocked. Try again in ${ban.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  if (
    pathname.startsWith("/api/") &&
    !isPublicPath(pathname) &&
    pathname !== "/api/health" &&
    !isBrowsingApiPath(pathname) &&
    pathname !== "/api/iptv/refresh" &&
    pathname !== "/api/search/ask"
  ) {
    const apiRate = checkApiRateLimit(ip);
    if (!apiRate.allowed) {
      const actionHint =
        apiRate.action === "login"
          ? "Too many failed sign-in attempts"
          : "Too many API requests";
      return NextResponse.json(
        {
          error: `${actionHint}. Try again in ${apiRate.retryAfterSeconds}s.`,
          action: apiRate.action ?? "api",
          retryAfterSeconds: apiRate.retryAfterSeconds,
        },
        { status: 429 },
      );
    }
  }

  const session = parseSession(request);
  const gateEnabled = isAccessGateEnabled();
  const gateCookie = request.cookies.get(ACCESS_GATE_COOKIE)?.value;
  const gatePassed = !gateEnabled || hasValidAccessGateCookie(gateCookie);

  if (pathname === "/library" || pathname.startsWith("/library/")) {
    return NextResponse.redirect(new URL("/movies", request.url));
  }

  if (pathname.startsWith("/show/")) {
    const id = pathname.slice("/show/".length);
    return NextResponse.redirect(new URL(`/shows/${id}`, request.url));
  }

  if (gateEnabled && !gatePassed) {
    if (pathname === "/gate" || pathname.startsWith("/api/auth/gate")) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/health")) {
      return NextResponse.next();
    }
    if (!isPublicPath(pathname) && pathname !== "/gate") {
      return gateRedirect(request);
    }
  }

  if (pathname === "/gate" && gatePassed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/settings")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/api/admin")) {
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!isAdminRole(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicPath(pathname)) return NextResponse.next();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/library/:path*",
    "/movies/:path*",
    "/shows/:path*",
    "/show/:path*",
    "/watch/:path*",
    "/live/:path*",
    "/settings/:path*",
    "/login",
    "/gate",
    "/legal/:path*",
    "/support",
    "/terms",
    "/api/:path*",
  ],
};
