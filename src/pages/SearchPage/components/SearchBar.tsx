import { useState, SubmitEvent } from "react";
import Dropdown from "@/components/Dropdown";
import { SearchIcon } from "@/components/icons";

interface SearchBarProps {
  onSearch: (query: string, searchType: string) => void;
  initialQuery?: string;
  initialSearchType?: string;
}

export default function SearchBar({
  onSearch,
  initialQuery = "",
  initialSearchType = "album",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState(initialSearchType);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, searchType);
    }
  };

  return (
    <form
      data-testid="search-form"
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Search by
        </label>
        <Dropdown
          options={[
            { value: "album", label: "Album" },
            { value: "artist", label: "Artist" },
          ]}
          value={searchType}
          onChange={setSearchType}
        />
      </div>

      <div className="flex gap-2">
        <input
          data-testid="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
        <button
          type="submit"
          className="px-3 sm:px-6 py-2 bg-pink-400 hover:bg-pink-300 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          <SearchIcon className="w-5 h-5 sm:hidden" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>
    </form>
  );
}
