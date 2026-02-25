import { useState } from "react";
import type { CollectedAlbum } from "@/hooks/useExploration";
import AlbumCard from "./AlbumCard";
import SuggestionOverlay from "./SuggestionOverlay";
import Spinner from "@/components/Spinner";

interface CompletionScreenProps {
  collectedAlbums: CollectedAlbum[];
  onReset: () => void;
}

export default function CompletionScreen({
  collectedAlbums,
  onReset,
}: CompletionScreenProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addAllDone, setAddAllDone] = useState(false);

  const handleAddAll = async () => {
    setAddingAll(true);
    try {
      await Promise.all(
        collectedAlbums.map((album) =>
          fetch("/api/lidarr/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ albumMbid: album.releaseGroup.id }),
          })
        )
      );
      setAddAllDone(true);
    } catch {
      // individual cards will show their own error states
    } finally {
      setAddingAll(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Your Collection
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {collectedAlbums.length} albums discovered during your exploration
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {collectedAlbums.map((album, i) => (
          <div
            key={album.releaseGroup.id}
            className="relative cascade-deal-in"
            style={
              {
                "--deal-index": i,
                "--deal-rotate": `${(i % 3 - 1) * 2}deg`,
              } as React.CSSProperties
            }
          >
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 text-black text-xs font-bold rounded-full flex items-center justify-center border-2 border-black z-10 shadow-cartoon-sm">
              {i + 1}
            </div>
            {album.tags && album.tags.length > 0 && (
              <div className="absolute -top-2 right-0 z-10 flex gap-0.5">
                {album.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded-full border border-pink-300 dark:border-pink-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <AlbumCard
              releaseGroup={album.releaseGroup}
              onClick={() => setFocusedIndex(i)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleAddAll}
          disabled={addingAll || addAllDone}
          className="px-5 py-2 font-bold bg-gradient-to-r from-pink-300 to-amber-300 hover:from-pink-200 hover:to-amber-200 text-black border-2 border-black rounded-lg shadow-cartoon-md active:shadow-cartoon-pressed active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50"
        >
          {addingAll ? (
            <span className="flex items-center gap-2">
              <Spinner /> Adding...
            </span>
          ) : addAllDone ? (
            "Added!"
          ) : (
            "Add All to Library"
          )}
        </button>
        <button
          onClick={onReset}
          className="px-5 py-2 font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-2 border-black rounded-lg shadow-cartoon-md active:shadow-cartoon-pressed active:translate-x-[1px] active:translate-y-[1px] transition-all"
        >
          Start Over
        </button>
      </div>

      {focusedIndex !== null && collectedAlbums[focusedIndex] && (
        <SuggestionOverlay
          releaseGroup={collectedAlbums[focusedIndex].releaseGroup}
          tags={collectedAlbums[focusedIndex].tags}
          onClose={() => setFocusedIndex(null)}
        />
      )}
    </div>
  );
}
