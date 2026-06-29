import { useState } from "react";
import useNavigateToArtist from "@/hooks/useNavigateToArtist";
import useHaptics from "@/hooks/useHaptics";
import {
  ChevronRightIcon,
  MusicalNoteIcon,
  CheckIcon,
} from "@/components/icons";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import FollowArtistButton from "@/components/FollowArtistButton";

interface ArtistCardProps {
  name: string;
  mbid?: string;
  imageUrl?: string;
  /** 0-1 similarity score, shown as percentage */
  match?: number;
  inLibrary?: boolean;
  /**
   * "list" (default) is a horizontal row; "grid" is a vertical card for grids;
   * "circle" is a compact circular avatar for dense exploration grids.
   */
  variant?: "list" | "grid" | "circle";
}

export default function ArtistCard({
  name,
  mbid,
  imageUrl,
  match,
  inLibrary,
  variant = "list",
}: ArtistCardProps) {
  const haptics = useHaptics();
  const { go } = useNavigateToArtist();
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    haptics.light();
    void go({ mbid, name });
  };

  const showImage = imageUrl && !imageError;

  if (variant === "circle") {
    return (
      <div className="relative flex flex-col items-center text-center group">
        <button
          onClick={handleClick}
          className="flex flex-col items-center w-full"
          aria-label={name}
        >
          <div className="relative w-full aspect-square">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-black shadow-cartoon-sm group-hover:translate-y-[-2px] group-hover:shadow-cartoon-md transition-all">
              {showImage ? (
                <ImageWithShimmer
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-amber-100 dark:bg-gray-700 flex items-center justify-center">
                  <MusicalNoteIcon className="w-8 h-8 text-amber-400 dark:text-amber-500" />
                </div>
              )}
            </div>
            {inLibrary && (
              <span
                className="absolute bottom-0 right-0 flex items-center justify-center w-5 h-5 bg-amber-300 text-black rounded-full border-2 border-black shadow-cartoon-sm"
                aria-label="In Library"
              >
                <CheckIcon className="w-3 h-3" />
              </span>
            )}
          </div>
          <h3 className="mt-2 w-full text-gray-900 dark:text-gray-100 font-medium text-xs truncate">
            {name}
          </h3>
          {match !== undefined && (
            <p className="text-gray-400 text-[11px]">
              {Math.round(match * 100)}% match
            </p>
          )}
        </button>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all">
        <button
          onClick={handleClick}
          className="w-full flex flex-col text-left hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="w-full aspect-square overflow-hidden border-b-2 border-black">
            {showImage ? (
              <ImageWithShimmer
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-amber-100 dark:bg-gray-700 flex items-center justify-center">
                <MusicalNoteIcon className="w-10 h-10 text-amber-400 dark:text-amber-500" />
              </div>
            )}
          </div>
          <div className="p-2.5 min-w-0">
            <h3 className="text-gray-900 dark:text-gray-100 font-medium text-sm truncate">
              {name}
            </h3>
            {match !== undefined && (
              <p className="text-gray-400 text-xs">
                {Math.round(match * 100)}% match
              </p>
            )}
            {inLibrary && (
              <span className="mt-1 inline-block text-xs bg-amber-300 text-black px-1.5 py-0.5 rounded-full border-2 border-black font-bold shadow-cartoon-sm">
                In Library
              </span>
            )}
          </div>
        </button>
        {mbid && (
          <FollowArtistButton
            artistMbid={mbid}
            artistName={name}
            size="sm"
            showLabel={false}
            className="absolute top-2 right-2"
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors"
      >
        {showImage ? (
          <ImageWithShimmer
            src={imageUrl}
            alt={name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-black"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center border-2 border-black">
            <MusicalNoteIcon className="w-6 h-6 text-amber-400 dark:text-amber-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-gray-900 dark:text-gray-100 font-medium truncate">
              {name}
            </h3>
            {inLibrary && (
              <span className="text-xs bg-amber-300 text-black px-1.5 py-0.5 rounded-full flex-shrink-0 border-2 border-black font-bold shadow-cartoon-sm">
                In Library
              </span>
            )}
          </div>
          {match !== undefined && (
            <p className="text-gray-400 text-xs">
              {Math.round(match * 100)}% match
            </p>
          )}
        </div>
        {mbid && (
          <FollowArtistButton
            artistMbid={mbid}
            artistName={name}
            size="sm"
            showLabel={false}
            className="flex-shrink-0"
          />
        )}
        <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </button>
    </div>
  );
}
