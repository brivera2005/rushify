import { BrowseContent } from "@/components/browse/BrowseContent";

export default function MoviesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Movies</h1>
      </div>

      <BrowseContent section="movies" emptyMessage="No movies in your library yet." />
    </div>
  );
}
