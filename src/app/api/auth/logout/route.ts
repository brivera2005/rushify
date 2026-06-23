import { NextResponse } from "next/server";

import { buildClearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  const cookie = buildClearSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
