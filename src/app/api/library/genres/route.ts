import { NextRequest, NextResponse } from "next/server";

import { fetchLibraryGenres } from "@/lib/jellyfin/library";
import { resolveJellyfinServerUrl } from "@/lib/jellyfin/discovery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const section = request.nextUrl.searchParams.get("section");
  if (section !== "movies" && section !== "shows") {
    return NextResponse.json({ error: "section must be movies or shows" }, { status: 400 });
  }

  const serverUrl = await resolveJellyfinServerUrl();
  if (!serverUrl) {
    return NextResponse.json({ error: "Media server offline" }, { status: 503 });
  }

  try {
    const genres = await fetchLibraryGenres(section);
    return NextResponse.json({ genres, section });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load genres";
    const status =
      message === "Not authenticated"
        ? 401
        : message === "Media server offline"
          ? 503
          : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
