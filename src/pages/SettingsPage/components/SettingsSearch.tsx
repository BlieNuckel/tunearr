interface SettingsSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export default function SettingsSearch({
  query,
  onQueryChange,
}: SettingsSearchProps) {
  return (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search settings..."
        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-base sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-400 shadow-cartoon-sm"
      />
    </div>
  );
}
