import { useState, useMemo } from "react";
import type { ReleaseGroup } from "@/types";
import ImageWithShimmer from "@/components/ImageWithShimmer";

interface AlbumCardProps {
  releaseGroup: ReleaseGroup;
  onClick?: () => void;
}

function pastelColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

export default function AlbumCard({ releaseGroup, onClick }: AlbumCardProps) {
  const [coverError, setCoverError] = useState(false);
  const artist =
    releaseGroup["artist-credit"]?.[0]?.artist?.name ?? "Unknown";
  const coverUrl = `https://coverartarchive.org/release-group/${releaseGroup.id}/front-250`;
  const pastelBg = useMemo(
    () => pastelColorFromId(releaseGroup.id),
    [releaseGroup.id]
  );

  return (
    <div
      data-testid="album-card"
      className={onClick ? "cursor-pointer select-none" : undefined}
      onClick={onClick}
    >
      <div
        className="rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden"
        style={{ backgroundColor: pastelBg }}
      >
        <div className="aspect-square relative">
          {!coverError && (
            <ImageWithShimmer
              src={coverUrl}
              alt={`${releaseGroup.title} cover`}
              className="w-full h-full object-cover"
              onError={() => setCoverError(true)}
            />
          )}
        </div>
      </div>
      <div className="mt-1.5 text-center px-1">
        <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
          {releaseGroup.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {artist}
        </p>
      </div>
    </div>
  );
}
