import { useState, useEffect } from "react";

/**
 * @param {{ onSearch: (query: string) => void, debounceMs?: number }} props
 */
export default function SearchBar({ onSearch, debounceMs = 500 }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!value.trim()) return;
    const timer = setTimeout(() => onSearch(value.trim()), debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search for albums or artists..."
      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
    />
  );
}
