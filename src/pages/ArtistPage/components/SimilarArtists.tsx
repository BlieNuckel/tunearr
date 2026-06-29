import ArtistCard from "@/pages/DiscoverPage/components/ArtistCard";
import Skeleton from "@/components/Skeleton";
import type { SimilarArtist } from "@/hooks/useSimilarArtists";

interface SimilarArtistsProps {
  artists: SimilarArtist[];
  loading: boolean;
  isArtistInLibrary: (mbid: string, name: string) => boolean;
}

const GRID_CLASSES = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3";

export default function SimilarArtists({
  artists,
  loading,
  isArtistInLibrary,
}: SimilarArtistsProps) {
  if (!loading && artists.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wide mb-3">
        Similar artists
      </h2>
      <div className={GRID_CLASSES}>
        {loading
          ? [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden"
              >
                <Skeleton className="w-full aspect-square rounded-none" />
                <div className="p-2.5 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          : artists.map((artist) => (
              <ArtistCard
                key={`${artist.name}-${artist.mbid}`}
                name={artist.name}
                mbid={artist.mbid || undefined}
                imageUrl={artist.imageUrl || undefined}
                match={artist.match}
                inLibrary={isArtistInLibrary(artist.mbid, artist.name)}
                variant="grid"
              />
            ))}
      </div>
    </section>
  );
}
