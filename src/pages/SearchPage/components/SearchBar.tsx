import { useEffect, useState, SubmitEvent, RefObject } from "react";
import { SearchIcon } from "@/components/icons";
import useHaptics from "@/hooks/useHaptics";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export default function SearchBar({
  onSearch,
  initialQuery = "",
  inputRef,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const haptics = useHaptics();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (query.trim()) {
      haptics.medium();
      onSearch(query);
    }
  };

  return (
    <form
      data-testid="search-form"
      onSubmit={handleSubmit}
      className="flex gap-2"
    >
      <input
        ref={inputRef}
        data-testid="search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search artists and albums..."
        className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
      />
      <button
        type="submit"
        className="px-3 sm:px-6 py-2 bg-pink-400 hover:bg-pink-300 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
      >
        <SearchIcon className="w-5 h-5 sm:hidden" />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
