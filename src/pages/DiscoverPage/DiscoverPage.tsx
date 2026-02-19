import { useState, useMemo } from "react";
import useDiscover from "@/hooks/useDiscover";
import PlexTopArtists from "./components/PlexTopArtists";
import LibraryPicker from "./components/LibraryPicker";
import ArtistSearchForm from "./components/ArtistSearchForm";
import TagList from "./components/TagList";
import ArtistResultsList from "./components/ArtistResultsList";

export default function DiscoverPage() {
  const {
    libraryArtists,
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

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const effectiveSelectedArtist = selectedArtist ?? autoSelectedArtist;

  const libraryMbids = useMemo(
    () => new Set(libraryArtists.map((a) => a.foreignArtistId)),
    [libraryArtists],
  );

  const libraryNames = useMemo(
    () => new Set(libraryArtists.map((a) => a.name.toLowerCase())),
    [libraryArtists],
  );

  const isInLibrary = (name: string, mbid?: string) => {
    if (mbid && libraryMbids.has(mbid)) return true;
    return libraryNames.has(name.toLowerCase());
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
      <h1 className="text-2xl font-bold text-white mb-6">Discover</h1>

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
        <p className="text-gray-400 mt-4">Loading...</p>
      )}
      {similarError && <p className="text-red-400 mt-4">{similarError}</p>}
      {tagArtistsError && <p className="text-red-400 mt-4">{tagArtistsError}</p>}

      {showingTagResults ? (
        <ArtistResultsList
          artists={tagArtists}
          isInLibrary={isInLibrary}
          pagination={{
            page: tagPagination.page,
            totalPages: tagPagination.totalPages,
            onPageChange: (page) => fetchTagArtists(activeTag!, page),
          }}
        />
      ) : (
        <ArtistResultsList artists={similarArtists} isInLibrary={isInLibrary} />
      )}

      {!effectiveSelectedArtist && !similarLoading && (
        <p className="text-gray-500 mt-6 text-center">
          {plexLoading
            ? "Loading your listening data..."
            : "Select an artist from your library or search for one to discover similar music."}
        </p>
      )}
    </div>
  );
}
