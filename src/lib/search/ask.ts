import "server-only";

import { getEnvOrNull } from "@/lib/config/env";
import { browseLibraryItems, searchLibraryItems } from "@/lib/jellyfin/library";
import type { JellyfinMediaItem } from "@/types/jellyfin";

export type SearchAskSection = "movies" | "shows" | "all";

export type SearchAskResult = {
  items: JellyfinMediaItem[];
  mode: "gemini" | "jellyfin";
  query: string;
};

type GeminiIntent = {
  searchTerms?: string[];
  genres?: string[];
  people?: string[];
  yearMin?: number;
  yearMax?: number;
};

async function fetchGeminiIntent(
  query: string,
  libraryContext: string,
  apiKey: string,
): Promise<GeminiIntent | null> {
  const prompt = `You help search a home media library (movies and TV shows).
Given the user query, extract structured search intent as JSON only — no markdown.
Return: {"searchTerms":["keyword"],"genres":["Genre"],"people":["Actor Name"],"yearMin":1990,"yearMax":2000}
Omit fields you cannot infer. Prefer concrete title/actor/genre terms.

Library context:
${libraryContext}

User query: ${query}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    return JSON.parse(text) as GeminiIntent;
  } catch {
    return null;
  }
}

async function buildLibraryContext(): Promise<string> {
  try {
    const [movies, shows] = await Promise.all([
      browseLibraryItems({ section: "movies", limit: 8, sort: "recent" }),
      browseLibraryItems({ section: "shows", limit: 8, sort: "recent" }),
    ]);
    const movieGenres = new Set(movies.items.flatMap((item) => item.genres ?? []));
    const showGenres = new Set(shows.items.flatMap((item) => item.genres ?? []));

    return [
      `Recent movies: ${movies.items.map((item) => item.name).join(", ") || "none"}`,
      `Recent shows: ${shows.items.map((item) => item.name).join(", ") || "none"}`,
      `Movie genres sample: ${[...movieGenres].slice(0, 12).join(", ") || "unknown"}`,
      `Show genres sample: ${[...showGenres].slice(0, 12).join(", ") || "unknown"}`,
    ].join("\n");
  } catch {
    return "Library context unavailable.";
  }
}

function dedupeItems(items: JellyfinMediaItem[]): JellyfinMediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function searchWithIntent(
  intent: GeminiIntent,
  section: SearchAskSection,
): Promise<JellyfinMediaItem[]> {
  const sections: Array<"movies" | "shows"> =
    section === "all" ? ["movies", "shows"] : [section];

  const terms = [
    ...(intent.searchTerms ?? []),
    ...(intent.people ?? []),
  ].filter(Boolean);

  const primaryTerm = terms[0] ?? intent.genres?.[0] ?? "";
  const results: JellyfinMediaItem[] = [];

  for (const librarySection of sections) {
    if (primaryTerm) {
      const searched = await searchLibraryItems({
        query: primaryTerm,
        section: librarySection,
        limit: 24,
      });
      results.push(...searched);
    }

    if (intent.genres?.[0]) {
      const page = await browseLibraryItems({
        section: librarySection,
        limit: 24,
        sort: "recent",
        genre: intent.genres[0],
        yearMin: intent.yearMin,
        yearMax: intent.yearMax,
        search: terms[1],
      });
      results.push(...page.items);
    }
  }

  for (const term of terms.slice(1, 3)) {
    const extra = await searchLibraryItems({ query: term, section, limit: 12 });
    results.push(...extra);
  }

  return dedupeItems(results).slice(0, 36);
}

export async function askLibrarySearch(
  query: string,
  section: SearchAskSection = "all",
): Promise<SearchAskResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { items: [], mode: "jellyfin", query: trimmed };
  }

  const env = getEnvOrNull();
  if (env?.GEMINI_API_KEY) {
    const context = await buildLibraryContext();
    const intent = await fetchGeminiIntent(trimmed, context, env.GEMINI_API_KEY);
    if (intent) {
      const items = await searchWithIntent(intent, section);
      if (items.length > 0) {
        return { items, mode: "gemini", query: trimmed };
      }
    }
  }

  const items = await searchLibraryItems({
    query: trimmed,
    section: section === "all" ? "all" : section,
    limit: 36,
  });

  if (items.length > 0) {
    return { items, mode: "jellyfin", query: trimmed };
  }

  const genreSections: Array<"movies" | "shows"> =
    section === "all" ? ["movies", "shows"] : [section];

  const genreMatches: JellyfinMediaItem[] = [];
  for (const librarySection of genreSections) {
    const page = await browseLibraryItems({
      section: librarySection,
      limit: 24,
      sort: "recent",
      genre: trimmed,
    });
    genreMatches.push(...page.items);
  }

  return {
    items: dedupeItems(genreMatches).slice(0, 36),
    mode: "jellyfin",
    query: trimmed,
  };
}
