import { notFound } from "next/navigation";

import { ShowContent } from "@/components/show/ShowContent";
import { fetchItemById, fetchSeriesEpisodes } from "@/lib/jellyfin/library";

export const dynamic = "force-dynamic";

type ShowPageProps = {
  params: { id: string };
};

export default async function ShowPage({ params }: ShowPageProps) {
  const series = await fetchItemById(params.id);
  if (!series || series.kind !== "Series") notFound();

  const episodes = await fetchSeriesEpisodes(series.id);

  return <ShowContent series={series} episodes={episodes} />;
}
