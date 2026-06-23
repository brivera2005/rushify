import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { checkSearchRateLimit } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import { askLibrarySearch, type SearchAskSection } from "@/lib/search/ask";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(1).max(500),
  section: z.enum(["movies", "shows", "all"]).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rate = checkSearchRateLimit(session.userId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Search limit reached. Try again in ${rate.retryAfterSeconds}s.`,
        action: "search",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds ?? 60) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const section = (parsed.data.section ?? "all") as SearchAskSection;
    const result = await askLibrarySearch(parsed.data.query, section);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    const userMessage =
      message === "Media server offline"
        ? "Library search is temporarily unavailable"
        : message;
    const status =
      message === "Not authenticated"
        ? 401
        : message === "Media server offline"
          ? 503
          : 502;
    return NextResponse.json({ error: userMessage }, { status });
  }
}
