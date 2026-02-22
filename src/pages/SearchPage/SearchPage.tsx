import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "./components/SearchBar";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";
import useSearch from "@/hooks/useSearch";

const DEAL_ROTATIONS = [-4, 3.5, -3, 4.5, -3.5, 3];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { results, loading, error, search } = useSearch();

  const query = searchParams.get("q") ?? "";
  const searchType = searchParams.get("searchType") ?? "album";

  useEffect(() => {
    if (query) {
      search(query, searchType);
    }
  }, [query, searchType, search]);

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
      />

      {loading && <p className="text-gray-500 mt-4">Searching...</p>}

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
              <ReleaseGroupCard releaseGroup={rg} />
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
              <p className="mt-1">
                Try a different search term or change the search type.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-500">
                Search for music
              </p>
              <p className="mt-1">
                Find albums or artists by name to add to your library.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
