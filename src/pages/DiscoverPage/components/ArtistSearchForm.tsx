import { useState } from "react";
import { SearchIcon } from "@/components/icons";

interface ArtistSearchFormProps {
  onSearch: (name: string) => void;
}

export default function ArtistSearchForm({ onSearch }: ArtistSearchFormProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  return (
    <div className="lg:col-span-2">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        Search any artist
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an artist name..."
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 text-sm shadow-cartoon-md"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 sm:px-4 py-2 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          <SearchIcon className="w-5 h-5 sm:hidden" />
          <span className="hidden sm:inline">Find Similar</span>
        </button>
      </form>
    </div>
  );
}
