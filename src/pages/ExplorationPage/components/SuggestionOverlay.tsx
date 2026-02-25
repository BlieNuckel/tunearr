import type { ReleaseGroup } from "@/types";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";

interface SuggestionOverlayProps {
  releaseGroup: ReleaseGroup;
  tag?: string;
  onPick?: () => void;
  onClose: () => void;
}

export default function SuggestionOverlay({
  releaseGroup,
  tag,
  onPick,
  onClose,
}: SuggestionOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-xs sm:max-w-sm animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {tag && (
          <div className="text-center mb-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full border border-pink-300 dark:border-pink-700">
              {tag}
            </span>
          </div>
        )}
        <ReleaseGroupCard releaseGroup={releaseGroup} defaultExpanded />
        <div className="mt-3 flex gap-2">
          {onPick && (
            <button
              onClick={onPick}
              className="flex-1 py-2 text-sm font-bold bg-amber-400 text-black border-2 border-black rounded-lg hover:bg-amber-300 transition-colors shadow-cartoon-sm"
            >
              Pick this
            </button>
          )}
          <button
            onClick={onClose}
            className={`py-2 text-sm font-bold border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${onPick ? "px-3" : "flex-1"}`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
