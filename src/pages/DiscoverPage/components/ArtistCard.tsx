import { useState } from "react";
import useNavigateToArtist from "@/hooks/useNavigateToArtist";
import useHaptics from "@/hooks/useHaptics";
import { MusicalNoteIcon, CheckIcon } from "@/components/icons";
import ImageWithShimmer from "@/components/ImageWithShimmer";

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

  const showImage = imageUrl && !imageError;

  return (
    <button
      onClick={handleClick}
      className="group flex flex-col items-center w-full text-center"
      aria-label={name}
    >
      <div className="relative w-full aspect-square">
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-black shadow-cartoon-md group-hover:translate-y-[-2px] group-hover:shadow-cartoon-lg transition-all">
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
  );
}
