import { useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "./components/SearchBar";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";
import Skeleton from "@/components/Skeleton";
import useSearch from "@/hooks/useSearch";
import useLibraryAlbums from "@/hooks/useLibraryAlbums";

const DEAL_ROTATIONS = [-4, 3.5, -3, 4.5, -3.5, 3];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { results, loading, error, search } = useSearch();
  const { isAlbumInLibrary } = useLibraryAlbums();
  const inputRef = useRef<HTMLInputElement>(null);

  const query = searchParams.get("q") ?? "";
  const searchType = searchParams.get("searchType") ?? "album";

  useEffect(() => {
    if (query) {
      search(query, searchType);
    }
  }, [query, searchType, search]);

  useEffect(() => {
    const handleReset = () => {
      setSearchParams({});
      inputRef.current?.focus();
    };
    window.addEventListener("search:reset", handleReset);
    return () => window.removeEventListener("search:reset", handleReset);
  }, [setSearchParams]);

  const handleSearch = useCallback(
    (newQuery: string, newSearchType: string) => {
      setSearchParams({ q: newQuery, searchType: newSearchType });
    },
    [setSearchParams]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Albums</h1>

      <SearchBar
        onSearch={handleSearch}
        initialQuery={query}
        initialSearchType={searchType}
        inputRef={inputRef}
      />

      {loading && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="sm:hidden bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden">
                <div className="flex items-center">
                  <Skeleton className="w-24 aspect-square flex-shrink-0 rounded-none" />
                  <div className="flex-1 min-w-0 px-4 py-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </div>
              <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden">
                <Skeleton className="aspect-square rounded-none" />
                <div className="p-3 border-t-2 border-black space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-rose-500 mt-4">Error: {error}</p>}

      {results.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
          {results.map((rg, index) => (
            <div
              key={rg.id}
              className="cascade-deal-in"
              style={
                {
                  "--deal-index": index,
                  "--deal-rotate": `${DEAL_ROTATIONS[index % DEAL_ROTATIONS.length]}deg`,
                } as React.CSSProperties
              }
            >
              <ReleaseGroupCard
                releaseGroup={rg}
                inLibrary={isAlbumInLibrary(rg.id)}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-gray-400 animate-fade-in">
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
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          {query ? (
            <>
              <p className="text-lg font-medium text-gray-500">
                No results found
              </p>
              <p className="mt-1 text-center">
                Try a different search term or change the search type.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-500">
                Search for music
              </p>
              <p className="mt-1 text-center">
                Find albums or artists by name to add to your library.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
