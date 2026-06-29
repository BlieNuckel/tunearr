import ArtistCard from "@/pages/DiscoverPage/components/ArtistCard";
import Skeleton from "@/components/Skeleton";
import type { SimilarArtist } from "@/hooks/useSimilarArtists";

interface SimilarArtistsProps {
  artists: SimilarArtist[];
  loading: boolean;
  isArtistInLibrary: (mbid: string, name: string) => boolean;
}

const GRID_CLASSES =
  "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-3 sm:gap-4";

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
          ? [...Array(10)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-full aspect-square rounded-full" />
                <Skeleton className="mt-2 h-3 w-3/4" />
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
                variant="circle"
              />
            ))}
      </div>
    </section>
  );
}
