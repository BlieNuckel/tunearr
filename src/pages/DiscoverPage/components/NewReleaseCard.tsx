import { useState } from "react";
import { Link } from "react-router-dom";
import useHaptics from "@/hooks/useHaptics";
import { MusicalNoteIcon } from "@/components/icons";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import AlbumLibraryBadge from "@/components/AlbumLibraryBadge";
import type { AlbumLibraryState } from "@shared/albumLibrary";
import { formatRelativeReleaseDate } from "@/utils/relativeDate";
import type { NewReleaseItem } from "@/types";

interface NewReleaseCardProps {
  item: NewReleaseItem;
}

const LIDARR_STATUS_LABELS = {
  downloading: "Downloading",
  wanted: "Requested, not downloaded",
  imported: "In library",
} as const;

const LIDARR_STATUS_BADGE_STATES: Record<
  keyof typeof LIDARR_STATUS_LABELS,
  AlbumLibraryState
> = {
  downloading: "partial",
  wanted: "requested",
  imported: "complete",
};

function cardHref(item: NewReleaseItem): string {
  if (item.releaseGroupMbid) return `/album/${item.releaseGroupMbid}`;
  const query = `${item.artistName} ${item.title}`.trim();
  return `/search?q=${encodeURIComponent(query)}`;
}

function markViewed(followedReleaseId: number): void {
  void fetch(`/api/followed/releases/${followedReleaseId}/viewed`, {
    method: "POST",
  }).catch(() => {});
}

export default function NewReleaseCard({ item }: NewReleaseCardProps) {
  const haptics = useHaptics();
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    haptics.light();
    if (item.followedReleaseId !== null) {
      markViewed(item.followedReleaseId);
    }
  };

  const showImage = item.coverUrl && !imageError;
  const releasedAgo = formatRelativeReleaseDate(item.releaseDate);

  return (
    <Link
      to={cardHref(item)}
      onClick={handleClick}
      className="group flex flex-col w-full text-left"
      aria-label={`${item.title} by ${item.artistName}`}
    >
      <div className="relative w-full aspect-square">
        <div className="w-full h-full rounded-xl overflow-hidden border-2 border-black shadow-cartoon-md group-hover:translate-y-[-2px] group-hover:shadow-cartoon-lg transition-all">
          {showImage ? (
            <ImageWithShimmer
              src={item.coverUrl!}
              alt={`${item.title} cover art`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-amber-100 dark:bg-gray-700 flex items-center justify-center">
              <MusicalNoteIcon className="w-8 h-8 text-amber-400 dark:text-amber-500" />
            </div>
          )}
        </div>
        {item.lidarrStatus && (
          <AlbumLibraryBadge
            state={LIDARR_STATUS_BADGE_STATES[item.lidarrStatus]}
            label={LIDARR_STATUS_LABELS[item.lidarrStatus]}
            className="absolute bottom-1 right-1"
          />
        )}
      </div>
      <h3 className="mt-2 text-gray-900 dark:text-gray-100 font-medium text-xs truncate">
        {item.title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-[11px] truncate">
        {item.artistName}
        {releasedAgo ? ` · ${releasedAgo}` : ""}
      </p>
    </Link>
  );
}
