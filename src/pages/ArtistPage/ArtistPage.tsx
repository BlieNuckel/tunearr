import { useMemo } from "react";
import { useParams } from "react-router-dom";
import useArtistDetails from "@/hooks/useArtistDetails";
import useLibraryAlbums from "@/hooks/useLibraryAlbums";
import useWantedAlbums from "@/hooks/useWantedAlbums";
import { groupArtistReleases } from "@/utils/groupArtistReleases";
import ArtistHeader from "./components/ArtistHeader";
import ReleaseSectionGrid from "./components/ReleaseSectionGrid";
import ArtistPageSkeleton from "./components/ArtistPageSkeleton";

export default function ArtistPage() {
  const { mbid } = useParams<{ mbid: string }>();
  const { artist, releaseGroups, loading, error } = useArtistDetails(mbid);
  const { isAlbumInLibrary } = useLibraryAlbums();
  const { isAlbumWanted } = useWantedAlbums();

  const sections = useMemo(
    () => (mbid ? groupArtistReleases(releaseGroups, mbid) : []),
    [releaseGroups, mbid]
  );

  const hasLibraryAlbum = useMemo(
    () => releaseGroups.some((rg) => isAlbumInLibrary(rg.id)),
    [releaseGroups, isAlbumInLibrary]
  );

  if (loading) return <ArtistPageSkeleton />;

  if (error || !artist) {
    return (
      <div className="mt-16 flex flex-col items-center text-gray-400 animate-fade-in">
        <p className="text-lg font-medium text-gray-500">
          {error ?? "Artist not found"}
        </p>
        <p className="mt-1 text-center">
          We couldn&apos;t load this artist. Try again from search.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ArtistHeader artist={artist} inLibrary={hasLibraryAlbum} />

      {sections.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          No releases found for this artist.
        </p>
      ) : (
        sections.map((section) => (
          <ReleaseSectionGrid
            key={section.title}
            title={section.title}
            items={section.items}
            isAlbumInLibrary={isAlbumInLibrary}
            isAlbumWanted={isAlbumWanted}
          />
        ))
      )}
    </div>
  );
}
