import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "./components/SearchBar";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";
import useSearch from "@/hooks/useSearch";

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
    [setSearchParams],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Search Albums</h1>

      <SearchBar
        onSearch={handleSearch}
        initialQuery={query}
        initialSearchType={searchType}
      />

      {loading && <p className="text-gray-400 mt-4">Searching...</p>}

      {error && <p className="text-red-400 mt-4">Error: {error}</p>}

      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map((rg) => (
            <ReleaseGroupCard key={rg.id} releaseGroup={rg} />
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="text-gray-500 mt-6 text-center">
          Search for an album or artist to get started.
        </p>
      )}
    </div>
  );
}
