import { NextResponse } from "next/server";

import { getEnvOrNull } from "@/lib/config/env";
import type { HealthStatus } from "@/types/rushify";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const env = getEnvOrNull();

  const status: HealthStatus = {
    status: env ? "ok" : "degraded",
    service: "rushify",
    timestamp: new Date().toISOString(),
    checks: {
      jellyfin: env ? "unknown" : "error",
      iptv: env ? "unknown" : "error",
    },
  };

  return NextResponse.json(status);
}
