import { useState } from "react";
import type { ReleaseGroup } from "@/types";
import useSearch from "@/hooks/useSearch";
import Spinner from "@/components/Spinner";
import ImageWithShimmer from "@/components/ImageWithShimmer";

interface SourceSearchProps {
  onSelect: (album: ReleaseGroup) => void;
}

function pastelColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
      />
    </svg>
  );
}

function SearchResultCard({
  rg,
  onPick,
}: {
  rg: ReleaseGroup;
  onPick: () => void;
}) {
  const [coverError, setCoverError] = useState(false);
  const artistName =
    rg["artist-credit"]?.[0]?.artist?.name || "Unknown Artist";
  const year = rg["first-release-date"]?.slice(0, 4) || "";
  const coverUrl = `https://coverartarchive.org/release-group/${rg.id}/front-500`;

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden flex items-center gap-3 p-2">
      <div
        className="w-14 h-14 rounded-lg flex-shrink-0 relative overflow-hidden"
        style={{ backgroundColor: pastelColorFromId(rg.id) }}
      >
        {!coverError && (
          <ImageWithShimmer
            src={coverUrl}
            alt={`${rg.title} cover`}
            className="w-full h-full object-cover"
            onError={() => setCoverError(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {rg.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {artistName}
        </p>
        {year && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{year}</p>
        )}
      </div>
      <button
        onClick={onPick}
        className="flex-shrink-0 px-3 py-1.5 text-sm font-bold bg-gradient-to-r from-pink-300 to-amber-300 hover:from-pink-200 hover:to-amber-200 text-black border-2 border-black rounded-lg shadow-cartoon-sm active:shadow-cartoon-pressed active:translate-x-[1px] active:translate-y-[1px] transition-all"
      >
        Pick
      </button>
    </div>
  );
}

export default function SourceSearch({ onSelect }: SourceSearchProps) {
  const [query, setQuery] = useState("");
  const { results, loading, error, search } = useSearch();
  const hasSearched = results.length > 0 || loading || error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query, "album");
  };

  return (
    <div
      className={`transition-[padding] duration-700 ease-out ${
        hasSearched ? "pt-4 md:pt-8" : "pt-[20vh] md:pt-[25vh]"
      }`}
    >
      <div className="text-center mb-8 md:mb-10">
        <div className="explore-title-in relative inline-block mb-3">
          <SparkleIcon className="absolute -top-4 -right-5 md:-top-6 md:-right-7 w-7 h-7 md:w-9 md:h-9 text-amber-400 sparkle-pulse" />
          <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-pink-500 via-amber-400 to-rose-500 dark:from-pink-400 dark:via-amber-300 dark:to-rose-400 bg-clip-text text-transparent">
            Explore
          </h1>
        </div>
        <p
          className="explore-fade-up text-base md:text-lg text-gray-600 dark:text-gray-300"
          style={{ animationDelay: "0.3s" }}
        >
          Pick a starting album and discover new music through tags
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="explore-fade-up max-w-md mx-auto mb-8"
        style={{ animationDelay: "0.5s" }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search albums..."
            className="flex-1 px-4 py-2.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-cartoon-sm focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 font-bold bg-gradient-to-r from-pink-300 to-amber-300 hover:from-pink-200 hover:to-amber-200 text-black border-2 border-black rounded-lg shadow-cartoon-sm active:shadow-cartoon-pressed active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50"
          >
            {loading ? <Spinner /> : "Search"}
          </button>
        </div>
      </form>

      {error && <p className="text-rose-500 text-center mb-4">{error}</p>}

      <div className="max-w-lg mx-auto space-y-2">
        {results.map((rg, i) => (
          <div
            key={rg.id}
            className="stagger-fade-in"
            style={{ "--stagger-index": i } as React.CSSProperties}
          >
            <SearchResultCard rg={rg} onPick={() => onSelect(rg)} />
          </div>
        ))}
      </div>
    </div>
  );
}
