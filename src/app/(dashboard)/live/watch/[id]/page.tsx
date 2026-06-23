import { LiveWatchClient } from "@/components/live/LiveWatchClient";

type LiveWatchPageProps = {
  params: { id: string };
};

export default function LiveWatchPage({ params }: LiveWatchPageProps) {
  return <LiveWatchClient channelId={params.id} />;
}
