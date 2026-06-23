import { NextResponse } from "next/server";

import { getEnvOrNull, isIptvConfigured, isJellyfinConfigured } from "@/lib/config/env";
import { getJellyfinStatus } from "@/lib/jellyfin/client";
import { getIptvStatus } from "@/lib/iptv/status";
import type { HealthStatus, ServiceCheckStatus } from "@/types/rushify";

export const dynamic = "force-dynamic";

function resolveJellyfinCheck(
  configured: boolean,
  connected: boolean,
): ServiceCheckStatus {
  if (!configured) {
    return "not_configured";
  }
  return connected ? "ok" : "error";
}

function resolveIptvCheck(configured: boolean): ServiceCheckStatus {
  if (!configured) {
    return "not_configured";
  }
  return "ok";
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const env = getEnvOrNull();

  let jellyfinCheck: ServiceCheckStatus = "not_configured";
  let iptvCheck: ServiceCheckStatus = "not_configured";

  if (env) {
    if (isJellyfinConfigured(env)) {
      const jellyfin = await getJellyfinStatus();
      jellyfinCheck = resolveJellyfinCheck(jellyfin.configured, jellyfin.connected);
    }

    if (isIptvConfigured(env)) {
      const iptv = await getIptvStatus();
      iptvCheck = resolveIptvCheck(iptv.configured);
    }
  }

  const checks = [jellyfinCheck, iptvCheck];
  const hasError = checks.includes("error");
  const allNotConfigured = checks.every((check) => check === "not_configured");

  const status: HealthStatus = {
    status: hasError ? "error" : allNotConfigured ? "degraded" : "ok",
    service: "rushify",
    timestamp: new Date().toISOString(),
    checks: {
      jellyfin: jellyfinCheck,
      iptv: iptvCheck,
    },
  };

  return NextResponse.json(status);
}
