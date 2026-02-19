import ArtistCard from "./ArtistCard";
import Pagination from "@/components/Pagination";

interface Artist {
  name: string;
  imageUrl?: string;
  match?: number;
  mbid?: string;
  rank?: number;
}

interface ArtistResultsListProps {
  artists: Artist[];
  isInLibrary: (name: string, mbid?: string) => boolean;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export default function ArtistResultsList({ artists, isInLibrary, pagination }: ArtistResultsListProps) {
  if (artists.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      {artists.map((artist) => (
        <ArtistCard
          key={`${artist.name}-${artist.match ?? artist.rank}`}
          name={artist.name}
          imageUrl={artist.imageUrl}
          match={artist.match}
          inLibrary={isInLibrary(artist.name, artist.mbid)}
        />
      ))}
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
