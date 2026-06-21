"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RushifyLogo } from "@/components/layout/RushifyLogo";
import { cn } from "@/lib/utils/cn";

const mobileLinks = [
  { label: "Home", href: "/" },
  { label: "Live", href: "/live" },
  { label: "Library", href: "/library" },
  { label: "Settings", href: "/settings" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-rush-border bg-rush-canvas/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
        <div className="lg:hidden">
          <RushifyLogo compact />
        </div>
        <div className="hidden lg:block">
          <p className="text-sm uppercase tracking-[0.35em] text-rush-muted">
            Your unified media hub
          </p>
        </div>
        <div className="rounded-full border border-rush-border bg-rush-surface px-4 py-2 text-xs text-rush-muted">
          Server-side streaming proxy active
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:hidden">
        {mobileLinks.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors",
                active
                  ? "bg-rush-accent/20 text-rush-foreground"
                  : "bg-rush-surface text-rush-muted",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
