import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-rush-canvas text-rush-foreground">
      <div className="pointer-events-none fixed inset-0 bg-hero-glow opacity-70" />
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="min-w-0 flex-1 animate-fade-in px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
