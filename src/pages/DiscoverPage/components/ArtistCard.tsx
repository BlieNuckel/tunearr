import { useState } from "react";
import useNavigateToArtist from "@/hooks/useNavigateToArtist";
import useHaptics from "@/hooks/useHaptics";
import { ChevronRightIcon, MusicalNoteIcon } from "@/components/icons";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import FollowArtistButton from "@/components/FollowArtistButton";

interface ArtistCardProps {
  name: string;
  mbid?: string;
  imageUrl?: string;
  /** 0-1 similarity score, shown as percentage */
  match?: number;
  inLibrary?: boolean;
}

export default function ArtistCard({
  name,
  mbid,
  imageUrl,
  match,
  inLibrary,
}: ArtistCardProps) {
  const haptics = useHaptics();
  const { go } = useNavigateToArtist();
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    haptics.light();
    void go({ mbid, name });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors"
      >
        {imageUrl && !imageError ? (
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
