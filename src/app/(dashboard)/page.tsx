import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

const placeholderCards = [
  {
    title: "Continue Watching",
    description: "Pick up where you left off across movies and series.",
    href: "/library",
    items: ["Feature film placeholder", "Series episode placeholder", "Documentary placeholder"],
  },
  {
    title: "Live Now",
    description: "Tune into channels airing right now from your IPTV guide.",
    href: "/live",
    items: ["News channel placeholder", "Sports channel placeholder", "Entertainment placeholder"],
  },
  {
    title: "Library Highlights",
    description: "Fresh additions and curated picks from your media library.",
    href: "/library",
    items: ["Recently added movie", "Trending series", "Music collection"],
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-rush-border bg-rush-surface/70 p-8 shadow-glow lg:p-12">
        <p className="text-sm uppercase tracking-[0.35em] text-rush-accent">Rushify Dashboard</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-rush-foreground lg:text-5xl">
          One cinematic home for live TV and your personal library.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-rush-muted">
          Rushify unifies IPTV and your media server behind a premium white-label
          experience. All requests flow through secure server-side routes—your browser
          never talks to upstream services directly.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/live">
            <Button>Explore Live TV</Button>
          </Link>
          <Link href="/library">
            <Button variant="secondary">Browse Library</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {placeholderCards.map((section) => (
          <Card key={section.title} glow>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
            <ul className="mt-5 space-y-3">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-rush-border/80 bg-rush-canvas/60 px-4 py-3 text-sm text-rush-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={section.href}
              className="mt-5 inline-flex text-sm font-medium text-rush-accent hover:text-rush-accent/80"
            >
              View section
            </Link>
          </Card>
        ))}
      </section>
    </div>
  );
}
