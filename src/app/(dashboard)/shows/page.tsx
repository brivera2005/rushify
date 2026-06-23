import { BrowseContent } from "@/components/browse/BrowseContent";

export default function ShowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Shows</h1>
      </div>

      <BrowseContent section="shows" emptyMessage="No shows in your library yet." />
    </div>
  );
}
