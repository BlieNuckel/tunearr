import SearchBar from "./components/SearchBar";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";
import useSearch from "@/hooks/useSearch";

export default function SearchPage() {
  const { results, loading, error, search } = useSearch();

  const handleSearch = (query: string, searchType: string) => {
    search(query, searchType);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Search Albums</h1>

      <SearchBar onSearch={handleSearch} />

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
