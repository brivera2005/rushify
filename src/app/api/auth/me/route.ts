import { NextResponse } from "next/server";

import { isAdminRole, isRushifyLocalSession } from "@/lib/auth/rushify-users";
import { validateSession } from "@/lib/auth/jellyfin-auth";
import { getSession } from "@/lib/auth/session";
import { resolveJellyfinServerUrl } from "@/lib/jellyfin/discovery";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const serverUrl = await resolveJellyfinServerUrl();
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        user: null,
        serverReachable: Boolean(serverUrl),
      },
      { status: 401 },
    );
  }

  if (isRushifyLocalSession(session)) {
    return NextResponse.json({
      user: {
        id: session.userId,
        username: session.username,
        role: session.role ?? (session.isAdmin ? "admin" : "user"),
      },
      serverReachable: Boolean(serverUrl),
      isAdmin: isAdminRole(session),
    });
  }

  const valid = await validateSession(session);
  if (!valid) {
    return NextResponse.json(
      {
        user: null,
        serverReachable: Boolean(serverUrl),
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    user: { id: session.userId, username: session.username, role: "user" as const },
    serverReachable: Boolean(serverUrl),
    isAdmin: false,
  });
}
