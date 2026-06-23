import { NextResponse } from "next/server";

import { getIptvStatus } from "@/lib/iptv/status";
import type { IptvStatusResponse } from "@/types/rushify";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<IptvStatusResponse>> {
  const status = await getIptvStatus();
  return NextResponse.json(status);
}
