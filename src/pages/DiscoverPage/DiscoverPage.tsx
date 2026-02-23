import { useState, useMemo } from "react";
import useDiscover from "@/hooks/useDiscover";
import usePromotedAlbum from "@/hooks/usePromotedAlbum";
import PromotedAlbum from "./components/PromotedAlbum";
import PlexTopArtists from "./components/PlexTopArtists";
import LibraryPicker from "./components/LibraryPicker";
import ArtistSearchForm from "./components/ArtistSearchForm";
import TagList from "./components/TagList";
import ArtistResultsList from "./components/ArtistResultsList";
import Skeleton from "@/components/Skeleton";

export default function DiscoverPage() {
  const {
    libraryArtists,
    libraryAlbums,
    libraryLoading,
    plexTopArtists,
    plexLoading,
    autoSelectedArtist,
    similarArtists,
    similarLoading,
    similarError,
    artistTags,
    tagArtists,
    tagArtistSections,
    tagArtistsLoading,
    tagArtistsError,
    tagPagination,
    fetchSimilar,
    fetchTagArtists,
  } = useDiscover();

  const {
    promotedAlbum,
    loading: promotedLoading,
    refresh: refreshPromotedAlbum,
  } = usePromotedAlbum();

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const effectiveSelectedArtist = selectedArtist ?? autoSelectedArtist;

  const libraryMbids = useMemo(
    () => new Set(libraryArtists.map((a) => a.foreignArtistId)),
    [libraryArtists]
  );

  const libraryNames = useMemo(
    () => new Set(libraryArtists.map((a) => a.name.toLowerCase())),
    [libraryArtists]
  );

  const libraryAlbumMbids = useMemo(
    () => new Set(libraryAlbums.map((a) => a.foreignAlbumId)),
    [libraryAlbums]
  );

  const isInLibrary = (name: string, mbid?: string) => {
    if (mbid && libraryMbids.has(mbid)) return true;
    return libraryNames.has(name.toLowerCase());
  };

  const isAlbumInLibrary = (albumMbid: string) => {
    return libraryAlbumMbids.has(albumMbid);
  };

  const handleArtistSelect = (name: string) => {
    setSelectedArtist(name);
    setActiveTags([]);
    fetchSimilar(name);
  };

  const handleTagClick = (tag: string) => {
    const newTags = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag];

    setActiveTags(newTags);

    if (newTags.length > 0) {
      fetchTagArtists(newTags);
    }
  };

  const showingTagResults =
    activeTags.length > 0 &&
    (tagArtists.length > 0 || tagArtistSections.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Discover
      </h1>

      {(promotedAlbum || promotedLoading) && (
        <PromotedAlbum
          data={promotedAlbum}
          loading={promotedLoading}
          onRefresh={refreshPromotedAlbum}
        />
      )}

      {!plexLoading && (
        <PlexTopArtists
          artists={plexTopArtists}
          selectedArtist={effectiveSelectedArtist}
          onSelect={handleArtistSelect}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <LibraryPicker
          artists={libraryArtists}
          loading={libraryLoading}
          selectedArtist={effectiveSelectedArtist}
          onSelect={handleArtistSelect}
        />
        <ArtistSearchForm onSearch={handleArtistSelect} />
      </div>

      {effectiveSelectedArtist && (
        <TagList
          tags={artistTags}
          activeTags={activeTags}
          showingTagResults={!!showingTagResults}
          selectedArtist={effectiveSelectedArtist}
          onTagClick={handleTagClick}
        />
      )}

      {(similarLoading || tagArtistsLoading) && (
        <div className="mt-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {similarError && <p className="text-rose-500 mt-4">{similarError}</p>}
      {tagArtistsError && (
        <p className="text-rose-500 mt-4">{tagArtistsError}</p>
      )}

      {showingTagResults ? (
        <ArtistResultsList
          artists={tagArtists}
          sections={tagArtistSections}
          isInLibrary={isInLibrary}
          isAlbumInLibrary={isAlbumInLibrary}
          pagination={{
            page: tagPagination.page,
            totalPages: tagPagination.totalPages,
            onPageChange: (page) => fetchTagArtists(activeTags, page),
          }}
        />
      ) : (
        <ArtistResultsList
          artists={similarArtists}
          isInLibrary={isInLibrary}
          isAlbumInLibrary={isAlbumInLibrary}
        />
      )}

      {!effectiveSelectedArtist && !similarLoading && (
        <div className="mt-16 flex flex-col items-center text-gray-400 animate-fade-in">
          {plexLoading ? (
            <div className="space-y-3 w-full max-w-xs">
              <Skeleton className="h-5 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          ) : (
            <>
              <svg
                className="w-16 h-16 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
                />
              </svg>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                Discover new music
              </p>
              <p className="mt-1">
                Select an artist from your library or search for one to find
                similar music.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
