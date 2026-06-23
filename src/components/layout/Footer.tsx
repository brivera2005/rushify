import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-rush-border/60 bg-rush-canvas/40 px-4 py-5 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center text-xs text-rush-muted sm:flex-row sm:justify-between sm:text-left">
        <p>© 2026 Rushify · Developed by Benjamin Rivera</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/legal" className="transition-colors hover:text-rush-foreground">
            Terms
          </Link>
          <span aria-hidden className="text-rush-border">
            ·
          </span>
          <Link href="/legal/privacy" className="transition-colors hover:text-rush-foreground">
            Privacy
          </Link>
          <span aria-hidden className="text-rush-border">
            ·
          </span>
          <Link href="/support" className="transition-colors hover:text-rush-foreground">
            Support
          </Link>
        </nav>
      </div>
    </footer>
  );
}
