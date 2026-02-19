import { useState } from "react";

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
      <h2 className="text-sm font-medium text-gray-400 mb-2">Search any artist</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an artist name..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm transition-colors"
        >
          Find Similar
        </button>
      </form>
    </div>
  );
}
