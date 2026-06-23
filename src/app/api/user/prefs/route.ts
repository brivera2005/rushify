import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { readUserPrefs, writeUserPrefs } from "@/lib/user/prefs-store";
import type { UserPrefs } from "@/types/user-prefs";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const prefs = await readUserPrefs(session.username);
  return NextResponse.json(prefs);
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Partial<UserPrefs>;
  try {
    body = (await request.json()) as Partial<UserPrefs>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.hiddenCategories !== undefined && !Array.isArray(body.hiddenCategories)) {
    return NextResponse.json({ error: "hiddenCategories must be an array" }, { status: 400 });
  }

  const current = await readUserPrefs(session.username);
  const next: UserPrefs = {
    hiddenCategories:
      body.hiddenCategories !== undefined
        ? body.hiddenCategories.filter((entry): entry is string => typeof entry === "string")
        : current.hiddenCategories,
  };

  try {
    const saved = await writeUserPrefs(session.username, next);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("[user/prefs] write failed for", session.username, error);
    return NextResponse.json({ error: "Unable to save preferences" }, { status: 500 });
  }
}
