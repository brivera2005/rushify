import { HomeContent } from "@/components/dashboard/HomeContent";
import { LibrarySearchBar } from "@/components/search/LibrarySearchBar";
import { getSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[2rem] border border-rush-border bg-rush-surface/70 p-8 shadow-glow lg:p-12">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-rush-foreground lg:text-5xl">
          {session ? `Welcome back, ${session.username}` : "Welcome to Rushify"}
        </h1>
      </section>

      <LibrarySearchBar section="all" />

      <HomeContent />
    </div>
  );
}
