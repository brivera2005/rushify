import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { WatchPlayer } from "@/components/watch/WatchPlayer";
import { fetchItemById } from "@/lib/jellyfin/library";

export const dynamic = "force-dynamic";

type WatchPageProps = {
  params: { id: string };
};

export default async function WatchPage({ params }: WatchPageProps) {
  const item = await fetchItemById(params.id);
  if (!item) notFound();
  if (item.kind === "Series") redirect(`/shows/${encodeURIComponent(item.id)}`);

  return (
    <Suspense fallback={<div className="min-h-screen bg-rush-canvas" />}>
      <WatchPlayer item={item} />
    </Suspense>
  );
}
