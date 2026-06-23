"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { setLastLiveTab, type LiveTab } from "@/lib/iptv/client-storage";
import { cn } from "@/lib/utils/cn";

const tabs: { label: string; href: LiveTab }[] = [
  { label: "TV Guide", href: "/live/guide" },
  { label: "Channels", href: "/live/channels" },
];

export function LiveTvNav() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/live/guide") || pathname.startsWith("/live/watch/")) {
      setLastLiveTab("/live/guide");
    } else if (pathname.startsWith("/live/channels")) {
      setLastLiveTab("/live/channels");
    }
  }, [pathname]);

  return (
    <nav className="flex gap-1 rounded-2xl border border-rush-border bg-rush-surface/50 p-1">
      {tabs.map((tab) => {
        const active =
          tab.href === "/live/guide"
            ? pathname === "/live" ||
              pathname.startsWith("/live/guide") ||
              pathname.startsWith("/live/watch/")
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            tabIndex={0}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-all sm:flex-none focus:outline-none focus:ring-2 focus:ring-rush-accent/40",
              active
                ? "bg-rush-accent/20 text-rush-foreground shadow-glow-sm"
                : "text-rush-muted hover:bg-rush-elevated hover:text-rush-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
