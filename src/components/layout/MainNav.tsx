"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";
import type { RushifyNavItem } from "@/types/rushify";

const coreNavItems: RushifyNavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Movies", href: "/movies", icon: "movies" },
  { label: "Shows", href: "/shows", icon: "shows" },
  { label: "Live", href: "/live/guide", icon: "live" },
];

const settingsItem: RushifyNavItem = {
  label: "Settings",
  href: "/settings",
  icon: "settings",
};

type MainNavProps = {
  variant?: "sidebar" | "header";
  onNavigate?: () => void;
};

function NavIcon({ icon }: { icon: RushifyNavItem["icon"] }) {
  const paths: Record<RushifyNavItem["icon"], string> = {
    home: "M6 10.5 12 6l6 4.5V18a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 18v-7.5Z",
    live: "M8 10.5v7h3v-4.2l4.8 2.8V8.7L11 11.5V7.5H8v3Z M18 8.5h2.5v10H18V8.5Z",
    movies: "M7 8.5h11v11H7V8.5Zm2 2v7h7v-7H9Zm11-2h2.5v11H20v-11Z",
    shows: "M5 7.5h14v9H5v-9Zm2 2v5h10v-5H7Z M3 18.5h18v2H3v-2Z",
    settings:
      "M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Zm8.25 3.75a8.22 8.22 0 0 1-.15 1.5l2.02 1.58-1.5 2.6-2.38-.72a6.2 6.2 0 0 1-1.3.75l-.36 2.45H11.42l-.36-2.45a6.2 6.2 0 0 1-1.3-.75l-2.38.72-1.5-2.6 2.02-1.58a8.22 8.22 0 0 1-.15-1.5c0-.52.05-1.03.15-1.5L5.8 9.67l1.5-2.6 2.38.72c.4-.3.84-.55 1.3-.75l.36-2.45h4.32l.36 2.45c.46.2.9.45 1.3.75l2.38-.72 1.5 2.6-2.02 1.58c.1.47.15.98.15 1.5Z",
  };

  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d={paths[icon]} />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ variant = "sidebar", onNavigate }: MainNavProps) {
  const pathname = usePathname();

  const items = [...coreNavItems, settingsItem];

  if (variant === "header") {
    return (
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 lg:rounded-xl",
              isActive(pathname, item.href)
                ? "bg-rush-accent/20 text-rush-foreground shadow-glow-sm"
                : "bg-rush-surface text-rush-muted hover:bg-rush-elevated hover:text-rush-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 px-4 py-6">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          target={item.href.startsWith("http") ? "_blank" : undefined}
          rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
            isActive(pathname, item.href)
              ? "bg-rush-accent/15 text-rush-foreground shadow-glow-sm"
              : "text-rush-muted hover:bg-rush-surface hover:text-rush-foreground",
          )}
        >
          <NavIcon icon={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
