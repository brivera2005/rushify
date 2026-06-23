import Link from "next/link";

import { MainNav } from "@/components/layout/MainNav";
import { RushifyLogo } from "@/components/layout/RushifyLogo";

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-rush-border bg-rush-elevated/70 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="border-b border-rush-border px-6 py-6">
        <Link href="/">
          <RushifyLogo />
        </Link>
      </div>
      <MainNav variant="sidebar" />
    </aside>
  );
}
