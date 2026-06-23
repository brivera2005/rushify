"use client";

import Link from "next/link";

import { MainNav } from "@/components/layout/MainNav";
import { UserMenu } from "@/components/auth/UserMenu";
import { RushifyLogo } from "@/components/layout/RushifyLogo";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-rush-border bg-rush-canvas/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
          <Link href="/" className="shrink-0">
            <RushifyLogo compact />
          </Link>
          <div className="hidden min-w-0 flex-1 lg:block">
            <MainNav variant="header" />
          </div>
        </div>
        <UserMenu />
      </div>
      <div className="border-t border-rush-border/60 px-4 pb-3 pt-2 lg:hidden">
        <MainNav variant="header" />
      </div>
    </header>
  );
}
