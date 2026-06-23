import { redirect } from "next/navigation";

type LegacyShowPageProps = {
  params: { id: string };
};

export default function LegacyShowPage({ params }: LegacyShowPageProps) {
  redirect(`/shows/${encodeURIComponent(params.id)}`);
}
