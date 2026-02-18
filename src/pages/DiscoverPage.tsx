import { useState, useMemo, useEffect, useRef } from "react";
import useDiscover from "../hooks/useDiscover";
import ArtistCard from "../components/ArtistCard";

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
  const [searchInput, setSearchInput] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [libraryDropdownOpen, setLibraryDropdownOpen] = useState(false);
  const libraryDropdownRef = useRef<HTMLDivElement>(null);

  // Sync auto-selected artist from Plex into local state
  useEffect(() => {
    if (autoSelectedArtist && !selectedArtist) {
      setSelectedArtist(autoSelectedArtist);
    }
  }, [autoSelectedArtist, selectedArtist]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleArtistSelect(searchInput.trim());
    }
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    fetchTagArtists(tag);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(e.target as Node)) {
        setLibraryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLibrary = libraryFilter
    ? libraryArtists.filter((a) =>
        a.name.toLowerCase().includes(libraryFilter.toLowerCase()),
      )
    : libraryArtists;

  const showingTagResults = activeTag && tagArtists.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Discover</h1>

      {/* Plex most-played chips */}
      {!plexLoading && plexTopArtists.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-2">Based on your listening</h2>
          <div className="flex flex-wrap gap-2">
            {plexTopArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => handleArtistSelect(artist.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedArtist === artist.name
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {artist.thumb && (
                  <img
                    src={artist.thumb}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                {artist.name}
                <span className="text-xs opacity-60">{artist.viewCount} plays</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Library artist picker */}
        <div className="lg:col-span-1" ref={libraryDropdownRef}>
          <h2 className="text-sm font-medium text-gray-400 mb-2">Your Library</h2>
          {libraryLoading ? (
            <p className="text-gray-500 text-sm">Loading library...</p>
          ) : libraryArtists.length === 0 ? (
            <p className="text-gray-500 text-sm">No artists in library. Connect Lidarr in Settings.</p>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={libraryFilter}
                onChange={(e) => setLibraryFilter(e.target.value)}
                onFocus={() => setLibraryDropdownOpen(true)}
                placeholder="Search library..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
              {libraryDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 max-h-64 overflow-y-auto space-y-1 bg-gray-800 rounded-lg border border-gray-700 p-2 shadow-lg">
                  {filteredLibrary.length === 0 ? (
                    <p className="text-gray-500 text-sm px-3 py-2">No matches</p>
                  ) : (
                    filteredLibrary.map((artist) => (
                      <button
                        key={artist.id}
                        onClick={() => {
                          handleArtistSelect(artist.name);
                          setLibraryFilter("");
                          setLibraryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedArtist === artist.name
                            ? "bg-indigo-600 text-white"
                            : "text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {artist.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search any artist */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-gray-400 mb-2">Search any artist</h2>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Type an artist name..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <button
              type="submit"
              disabled={!searchInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm transition-colors"
            >
              Find Similar
            </button>
          </form>
        </div>
      </div>

      {/* Selected artist heading + tags */}
      {selectedArtist && (
        <div className="mb-4">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <h2 className="text-lg font-semibold text-white">
              {showingTagResults
                ? `Top artists for "${activeTag}"`
                : `Similar to "${selectedArtist}"`}
            </h2>
          </div>

          {artistTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {artistTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => handleTagClick(tag.name)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    activeTag === tag.name
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="px-2.5 py-1 rounded-full text-xs bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Back to similar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading / Error states */}
      {(similarLoading || tagArtistsLoading) && (
        <p className="text-gray-400 mt-4">Loading...</p>
      )}
      {similarError && <p className="text-red-400 mt-4">{similarError}</p>}
      {tagArtistsError && <p className="text-red-400 mt-4">{tagArtistsError}</p>}

      {/* Results grid */}
      {showingTagResults ? (
        <div className="space-y-2 mt-4">
          {tagArtists.map((artist) => (
            <ArtistCard
              key={`${artist.name}-${artist.rank}`}
              name={artist.name}
              imageUrl={artist.imageUrl}
              inLibrary={isInLibrary(artist.name, artist.mbid)}
            />
          ))}
          {tagPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => fetchTagArtists(activeTag!, tagPagination.page - 1)}
                disabled={tagPagination.page <= 1}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded text-sm transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm">
                Page {tagPagination.page} of {tagPagination.totalPages}
              </span>
              <button
                onClick={() => fetchTagArtists(activeTag!, tagPagination.page + 1)}
                disabled={tagPagination.page >= tagPagination.totalPages}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded text-sm transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        similarArtists.length > 0 && (
          <div className="space-y-2 mt-4">
            {similarArtists.map((artist) => (
              <ArtistCard
                key={`${artist.name}-${artist.match}`}
                name={artist.name}
                imageUrl={artist.imageUrl}
                match={artist.match}
                inLibrary={isInLibrary(artist.name, artist.mbid)}
              />
            ))}
          </div>
        )
      )}

      {/* Empty state */}
      {!selectedArtist && !similarLoading && (
        <p className="text-gray-500 mt-6 text-center">
          {plexLoading
            ? "Loading your listening data..."
            : "Select an artist from your library or search for one to discover similar music."}
        </p>
      )}
    </div>
  );
}
