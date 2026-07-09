import { useState } from "react";
import type { PromotedArtistsData } from "@/hooks/usePromotedArtists";
import ArtistCard from "./ArtistCard";
import Skeleton from "@/components/Skeleton";
import SectionHeader from "./SectionHeader";
import ShuffleButton from "./ShuffleButton";

interface PromotedArtistsProps {
  data: PromotedArtistsData | null;
  loading: boolean;
  onRefresh: () => void;
}

const GRID_CLASSES =
  "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3 sm:gap-4";

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
    <div>
      <SectionHeader
        title="Artists you might like"
        action={
          <ShuffleButton
            onClick={handleRefresh}
            disabled={isAnimating || loading}
            spinning={isAnimating || loading}
            ariaLabel="Shuffle recommended artists"
          />
        }
      />

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
          ? [...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-full aspect-square rounded-full" />
                <Skeleton className="mt-2 h-3 w-3/4" />
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
              />
            ))}
      </div>
    </div>
  );
}
