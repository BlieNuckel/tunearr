import ArtistCard from "./ArtistCard";
import Pagination from "@/components/Pagination";

interface Artist {
  name: string;
  imageUrl?: string;
  match?: number;
  mbid?: string;
  rank?: number;
}

interface Section {
  tagCount: number;
  tagNames: string[];
  artists: Artist[];
}

interface ArtistResultsListProps {
  artists: Artist[];
  sections?: Section[];
  isInLibrary: (name: string, mbid?: string) => boolean;
  isAlbumInLibrary: (albumMbid: string) => boolean;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

const getSectionTitle = (section: Section) => {
  const { tagCount, tagNames } = section;
  if (tagCount === tagNames.length) {
    return tagNames.length === 2
      ? `Matching both ${tagNames.join(" and ")}`
      : `Matching all ${tagNames.length} tags`;
  }
  return `Matching ${tagCount} of ${tagNames.length} tags`;
};

export default function ArtistResultsList({
  artists,
  sections,
  isInLibrary,
  isAlbumInLibrary,
  pagination,
}: ArtistResultsListProps) {
  if (sections && sections.length > 0) {
    return (
      <div className="mt-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-8">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              {getSectionTitle(section)}
            </h3>
            <div className="space-y-2">
              {section.artists.map((artist) => (
                <ArtistCard
                  key={`${artist.name}-${artist.rank}`}
                  name={artist.name}
                  imageUrl={artist.imageUrl}
                  match={artist.match}
                  inLibrary={isInLibrary(artist.name, artist.mbid)}
                  isAlbumInLibrary={isAlbumInLibrary}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

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
          isAlbumInLibrary={isAlbumInLibrary}
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
