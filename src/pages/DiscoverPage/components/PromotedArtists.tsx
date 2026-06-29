import { useState } from "react";
import type { PromotedArtistsData } from "@/hooks/usePromotedArtists";
import ArtistCard from "./ArtistCard";
import Skeleton from "@/components/Skeleton";
import { RefreshIcon } from "@/components/icons";

interface PromotedArtistsProps {
  data: PromotedArtistsData | null;
  loading: boolean;
  onRefresh: () => void;
}

const GRID_CLASSES = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3";

function formatSeeds(seeds: string[]): string {
  if (seeds.length === 1) return seeds[0];
  if (seeds.length === 2) return `${seeds[0]} and ${seeds[1]}`;
  return `${seeds.slice(0, -1).join(", ")}, and ${seeds[seeds.length - 1]}`;
}

export default function PromotedArtists({
  data,
  loading,
  onRefresh,
}: PromotedArtistsProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleRefresh = () => {
    if (loading) return;
    setIsAnimating(true);
    setTimeout(() => {
      onRefresh();
      setTimeout(() => setIsAnimating(false), 50);
    }, 300);
  };

  const artists = data?.artists ?? [];
  const seeds = data?.seedArtists ?? [];

  if (!loading && artists.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Artists you might like
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isAnimating || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Shuffle recommended artists"
        >
          <RefreshIcon
            className={`w-4 h-4 ${isAnimating || loading ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Shuffle</span>
        </button>
      </div>

      {seeds.length > 0 && !loading && (
        <p className="text-xs text-gray-400 mb-3">
          Because you listen to {formatSeeds(seeds)}
        </p>
      )}

      <div
        className={`${GRID_CLASSES} transition-all duration-300 ${
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {loading
          ? [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm p-3"
              >
                <Skeleton className="w-3/4 aspect-square rounded-full" />
                <Skeleton className="mt-2.5 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))
          : artists.map((artist) => (
              <ArtistCard
                key={`${artist.name}-${artist.mbid}`}
                name={artist.name}
                mbid={artist.mbid || undefined}
                imageUrl={artist.imageUrl || undefined}
                match={artist.match}
                inLibrary={artist.inLibrary}
                variant="grid"
              />
            ))}
      </div>
    </div>
  );
}
