import { NextRequest, NextResponse } from "next/server";

import {
  buildAccessGateCookie,
  isAccessGateEnabled,
  verifyAccessPin,
} from "@/lib/auth/access-gate";
import { checkLoginRateLimit, isIpBanned } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAccessGateEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const ip = clientIp(request);
  const ban = isIpBanned(ip);
  if (ban.banned) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${ban.retryAfterSeconds}s.` },
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

  let pin = "";
  try {
    const body = (await request.json()) as { pin?: string };
    pin = body.pin?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!pin) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  if (!verifyAccessPin(pin)) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const cookie = buildAccessGateCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
