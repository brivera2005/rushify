import { NextResponse } from "next/server";

import { isRushifyAuthConfigured } from "@/lib/auth/rushify-users";
import { getEnvOrNull, isAdminAuthConfigured } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const env = getEnvOrNull();
  const rushifyConfigured = env ? isRushifyAuthConfigured(env) : false;
  const adminConfigured = env ? isAdminAuthConfigured(env) : false;
  const canSignIn = rushifyConfigured || Boolean(env?.JELLYFIN_SERVER_URL);

  return NextResponse.json({ canSignIn, adminConfigured, rushifyConfigured });
}
