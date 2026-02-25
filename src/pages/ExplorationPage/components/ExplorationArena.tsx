import { useState, useCallback, useRef, useEffect } from "react";
import type { CollectedAlbum } from "@/hooks/useExploration";
import type { ReleaseGroup } from "@/types";
import TagCloud from "./TagCloud";
import SuggestionCard from "./SuggestionCard";
import SuggestionOverlay from "./SuggestionOverlay";
import CardHand from "./CardHand";

type Suggestion = {
  releaseGroup: ReleaseGroup;
  tags: string[];
};

interface ExplorationArenaProps {
  collectedAlbums: CollectedAlbum[];
  suggestions: Suggestion[];
  accumulatedTags: { name: string; count: number }[];
  loading: boolean;
  error: string | null;
  onSelect: (index: number) => void;
}

const FAN_CLASSES = [
  "flex justify-center items-end py-8",
  "[--fan-angle:8deg] sm:[--fan-angle:12deg]",
  "[--fan-pivot:120px] sm:[--fan-pivot:180px]",
  "[--fan-overlap:-28px] sm:[--fan-overlap:-20px]",
].join(" ");

function getFanStyle(
  index: number,
  total: number,
  dealt: boolean
): React.CSSProperties {
  const center = (total - 1) / 2;
  const offset = index - center;

  return {
    transform: dealt
      ? `rotate(calc(${offset} * var(--fan-angle)))`
      : `translateY(calc(100% + 12rem)) rotate(0deg) scale(0.6)`,
    transformOrigin: "center calc(100% + var(--fan-pivot))",
    opacity: dealt ? 1 : 0,
    transition: "all 0.6s cubic-bezier(0.22, 1.2, 0.36, 1)",
    transitionDelay: dealt ? `${index * 120}ms` : "0ms",
    zIndex: 10 - Math.round(Math.abs(offset) * 2),
    marginLeft: index > 0 ? "var(--fan-overlap)" : undefined,
  };
}

function getScatterRotate(index: number): string {
  return index === 0 ? "-15deg" : index === 2 ? "15deg" : "10deg";
}

export default function ExplorationArena({
  collectedAlbums,
  suggestions,
  accumulatedTags,
  loading,
  error,
  onSelect,
}: ExplorationArenaProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [dealt, setDealt] = useState(false);
  const isAnimating = useRef(false);
  const suggestionsKey = useRef("");

  useEffect(() => {
    const key = suggestions.map((s) => s.releaseGroup.id).join(",");
    if (key && key !== suggestionsKey.current) {
      suggestionsKey.current = key;
      setDealt(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDealt(true));
      });
    }
  }, [suggestions]);

  const sourceAlbum = collectedAlbums[collectedAlbums.length - 1];
  const sourceArtist =
    sourceAlbum?.releaseGroup["artist-credit"]?.[0]?.artist?.name ||
    "Unknown Artist";

  const handleFocusCard = useCallback((index: number) => {
    if (isAnimating.current) return;
    setFocusedIndex(index);
  }, []);

  const handlePick = useCallback(
    (index: number) => {
      if (isAnimating.current) return;
      isAnimating.current = true;
      setFocusedIndex(null);
      setAnimatingIndex(index);
      setTimeout(() => {
        setAnimatingIndex(null);
        isAnimating.current = false;
        onSelect(index);
      }, 400);
    },
    [onSelect]
  );

  return (
    <div className="animate-fade-in pb-28 md:pb-0 md:flex md:flex-col md:flex-1">
      {sourceAlbum && (
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Currently exploring from
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {sourceAlbum.releaseGroup.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sourceArtist}
          </p>
        </div>
      )}

      {accumulatedTags.length > 0 && (
        <div className="mb-8">
          <TagCloud tags={accumulatedTags} />
        </div>
      )}

      {error && <p className="text-rose-500 text-center">{error}</p>}

      {!loading && suggestions.length > 0 && (
        <div className={`${FAN_CLASSES} mb-8 md:mb-12`}>
          {suggestions.map((s, i) => {
            const animClass =
              animatingIndex === i
                ? "card-collect"
                : animatingIndex !== null
                  ? "card-scatter"
                  : "";

            return (
              <div
                key={s.releaseGroup.id}
                className={`w-24 sm:w-32 md:w-44 ${animClass}`}
                style={
                  {
                    ...getFanStyle(i, suggestions.length, dealt),
                    "--scatter-rotate": getScatterRotate(i),
                  } as React.CSSProperties
                }
              >
                <SuggestionCard
                  releaseGroup={s.releaseGroup}
                  tags={s.tags}
                  onClick={() => handleFocusCard(i)}
                />
              </div>
            );
          })}
        </div>
      )}

      {!loading && suggestions.length === 0 && !error && (
        <p className="text-gray-400 text-center">
          No suggestions found. Try a different album.
        </p>
      )}

      {focusedIndex !== null && suggestions[focusedIndex] && (
        <SuggestionOverlay
          releaseGroup={suggestions[focusedIndex].releaseGroup}
          tags={suggestions[focusedIndex].tags}
          onPick={() => handlePick(focusedIndex)}
          onClose={() => setFocusedIndex(null)}
        />
      )}

      <div className="hidden md:block md:flex-1" />
      {loading && <ShufflingDeck />}
      <CardHand albums={collectedAlbums} />
    </div>
  );
}

function ShufflingDeck() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative w-20 sm:w-24 md:w-32 aspect-square">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="deck-card absolute rounded-xl border-2 border-black bg-white dark:bg-gray-800 shadow-cartoon-sm flex items-center justify-center"
            style={
              {
                "--deck-index": i,
                inset: `${i * 3}px ${-i * 2}px ${-i * 3}px ${i * 2}px`,
              } as React.CSSProperties
            }
          >
            <VinylLogo />
          </div>
        ))}
      </div>
    </div>
  );
}

function VinylLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className="w-10 h-10 sm:w-12 sm:h-12 opacity-30 dark:opacity-20"
    >
      <circle cx="16" cy="16" r="14" fill="#FCD34D" stroke="black" strokeWidth="2" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="black" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6" fill="#F472B6" stroke="black" strokeWidth="2" />
      <circle cx="16" cy="16" r="2" fill="white" stroke="black" strokeWidth="1.5" />
    </svg>
  );
}
