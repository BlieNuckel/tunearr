import { useState } from "react";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import FollowArtistButton from "@/components/FollowArtistButton";
import { MusicalNoteIcon } from "@/components/icons";
import type { ArtistDetails } from "@/types";

interface ArtistHeaderProps {
  artist: ArtistDetails;
  inLibrary: boolean;
}

function buildSubtitle(artist: ArtistDetails): string {
  return [artist.type, artist.country, artist.disambiguation]
    .filter(Boolean)
    .join(" · ");
}

export default function ArtistHeader({ artist, inLibrary }: ArtistHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const subtitle = buildSubtitle(artist);

  return (
    <div className="flex items-center gap-4 mb-8">
      {artist.imageUrl && !imageError ? (
        <ImageWithShimmer
          src={artist.imageUrl}
          alt={artist.name}
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl object-cover flex-shrink-0 border-2 border-black shadow-cartoon-md"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-amber-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center border-2 border-black shadow-cartoon-md">
          <MusicalNoteIcon className="w-10 h-10 text-amber-400 dark:text-amber-500" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {artist.name}
          </h1>
          {inLibrary && (
            <span className="text-xs bg-amber-300 text-black px-1.5 py-0.5 rounded-full border-2 border-black font-bold shadow-cartoon-sm">
              In Library
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 truncate">
            {subtitle}
          </p>
        )}
        <div className="mt-3">
          <FollowArtistButton
            artistMbid={artist.mbid}
            artistName={artist.name}
            size="md"
          />
        </div>
      </div>
    </div>
  );
}
