import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { CAST_TOKEN_TTL_SECONDS, createCastToken } from "@/lib/cast/tokens";
import { getPublicAppUrl } from "@/lib/cast/public-url";
import type { StreamQuality } from "@/lib/jellyfin/stream";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.enum(["iptv", "vod"]),
  id: z.string().min(1),
  quality: z.enum(["auto", "original", "1080p", "720p", "480p"]).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cast token request" }, { status: 400 });
  }

  const { kind, id, quality } = parsed.data;
  const token = createCastToken(kind, id, quality as StreamQuality | undefined);
  const origin = getPublicAppUrl(request.nextUrl.origin);
  const streamUrl = `${origin}/api/stream/cast/${encodeURIComponent(token)}`;

  return NextResponse.json({
    token,
    streamUrl,
    expiresIn: CAST_TOKEN_TTL_SECONDS,
    contentType: kind === "iptv" ? "application/x-mpegURL" : "application/x-mpegURL",
  });
}
