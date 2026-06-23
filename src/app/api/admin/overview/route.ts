import { NextResponse } from "next/server";

import { getAdminOverview } from "@/lib/admin/overview";
import { isAdminRole } from "@/lib/auth/rushify-users";
import { getSession } from "@/lib/auth/session";
import type { AdminOverviewResponse } from "@/types/rushify";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<AdminOverviewResponse | { error: string }>> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const overview = await getAdminOverview();
  return NextResponse.json(overview);
}
