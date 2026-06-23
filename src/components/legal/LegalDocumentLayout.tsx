import Link from "next/link";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { RushifyLogo } from "@/components/layout/RushifyLogo";

type LegalDocumentLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalDocumentLayout({ title, children }: LegalDocumentLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-rush-canvas text-rush-foreground">
      <div className="pointer-events-none fixed inset-0 bg-hero-glow opacity-60" />
      <div className="relative flex min-h-screen flex-col">
        <header className="border-b border-rush-border/60 px-4 py-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <Link href="/" className="shrink-0">
              <RushifyLogo />
            </Link>
            <nav className="flex gap-4 text-sm text-rush-muted">
              <Link href="/legal" className="transition-colors hover:text-rush-foreground">
                Terms
              </Link>
              <Link href="/legal/privacy" className="transition-colors hover:text-rush-foreground">
                Privacy
              </Link>
              <Link href="/support" className="transition-colors hover:text-rush-foreground">
                Support
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-4 py-10 lg:px-8">
          <article className="prose-rushify mx-auto max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-rush-muted">Last updated: June 21, 2026</p>
            <div className="mt-8 space-y-8 text-sm leading-7 text-rush-muted">{children}</div>
          </article>
        </main>

        <Footer />
      </div>
    </div>
  );
}
