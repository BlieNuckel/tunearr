import { useState, useMemo } from "react";
import useDiscover from "@/hooks/useDiscover";
import usePromotedAlbum from "@/hooks/usePromotedAlbum";
import PromotedAlbum from "./components/PromotedAlbum";
import PlexTopArtists from "./components/PlexTopArtists";
import LibraryPicker from "./components/LibraryPicker";
import ArtistSearchForm from "./components/ArtistSearchForm";
import TagList from "./components/TagList";
import ArtistResultsList from "./components/ArtistResultsList";

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
  const [activeTag, setActiveTag] = useState<string | null>(null);

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
    setActiveTag(null);
    fetchSimilar(name);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    fetchTagArtists(tag);
  };

  const showingTagResults = activeTag && tagArtists.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Discover</h1>

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
          activeTag={activeTag}
          showingTagResults={!!showingTagResults}
          selectedArtist={effectiveSelectedArtist}
          onTagClick={handleTagClick}
          onClearTag={() => setActiveTag(null)}
        />
      )}

      {(similarLoading || tagArtistsLoading) && (
        <div className="flex items-center justify-center gap-3 py-12 bg-amber-50 rounded-xl border-2 border-black shadow-cartoon-sm mt-4">
          <div className="w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-700 font-medium">
            Discovering similar artists...
          </p>
        </div>
      )}
      {similarError && <p className="text-rose-500 mt-4">{similarError}</p>}
      {tagArtistsError && (
        <p className="text-rose-500 mt-4">{tagArtistsError}</p>
      )}

      {showingTagResults ? (
        <ArtistResultsList
          artists={tagArtists}
          isInLibrary={isInLibrary}
          isAlbumInLibrary={isAlbumInLibrary}
          pagination={{
            page: tagPagination.page,
            totalPages: tagPagination.totalPages,
            onPageChange: (page) => fetchTagArtists(activeTag!, page),
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
        <div className="mt-16 flex flex-col items-center text-gray-400">
          {plexLoading ? (
            <p className="text-gray-500">Loading your listening data...</p>
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
              <p className="text-lg font-medium text-gray-500">
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
