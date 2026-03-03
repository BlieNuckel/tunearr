import { Link } from "react-router-dom";
import useExploration from "@/hooks/useExploration";
import SourceSearch from "./components/SourceSearch";
import ExplorationArena from "./components/ExplorationArena";
import CompletionScreen from "./components/CompletionScreen";

export default function ExplorationPage() {
  const exploration = useExploration();
  const isRound = exploration.phase === "round";

  return (
    <div
      className={`min-h-screen ${isRound ? "md:h-screen md:overflow-hidden" : ""} bg-gradient-to-br from-pink-100 via-amber-50 to-rose-100 dark:from-pink-950/20 dark:via-gray-900 dark:to-amber-950/20`}
    >
      <div
        className={`max-w-5xl mx-auto px-4 md:px-8 py-6 ${isRound ? "md:h-full md:flex md:flex-col" : ""}`}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </Link>

        {exploration.phase !== "search" && (
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
            Explore
          </h1>
        )}

        {exploration.phase === "search" && (
          <SourceSearch onSelect={exploration.startExploration} />
        )}

        {isRound && (
          <div className="md:flex-1 md:min-h-0 md:flex md:flex-col">
            <ExplorationArena
              collectedAlbums={exploration.collectedAlbums}
              suggestions={exploration.suggestions}
              accumulatedTags={exploration.accumulatedTags}
              loading={exploration.loading}
              error={exploration.error}
              onSelect={exploration.selectSuggestion}
            />
          </div>
        )}

        {exploration.phase === "complete" && (
          <CompletionScreen
            collectedAlbums={exploration.collectedAlbums}
            onReset={exploration.reset}
          />
        )}
      </div>
    </div>
  );
}
