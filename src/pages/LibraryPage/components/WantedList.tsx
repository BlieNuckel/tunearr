import Skeleton from "@/components/Skeleton";
import WantedCard from "@/components/WantedCard";
import useLibraryAlbums from "@/hooks/useLibraryAlbums";
import type { WantedItem, ReleaseGroup } from "@/types";

interface WantedListProps {
  items: WantedItem[];
  loading: boolean;
  error: string | null;
  onRemove: (albumMbid: string) => void | Promise<void>;
}

function toReleaseGroup(item: WantedItem): ReleaseGroup {
  return {
    id: item.albumMbid,
    score: 0,
    title: item.albumTitle,
    "primary-type": "Album",
    "first-release-date": "",
    "artist-credit": [
      { name: item.artistName, artist: { id: "", name: item.artistName } },
    ],
  };
}

export default function WantedList({
  items,
  loading,
  error,
  onRemove,
}: WantedListProps) {
  const { isAlbumInLibrary } = useLibraryAlbums();
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden"
          >
            <Skeleton className="w-24 aspect-square flex-shrink-0 rounded-none" />
            <div className="flex-1 px-4 py-3 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-rose-500">
        <p>Failed to load wanted list: {error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm">Your wanted list is empty</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {items.map((item) => (
        <WantedCard
          key={item.albumMbid}
          releaseGroup={toReleaseGroup(item)}
          inLibrary={isAlbumInLibrary(item.albumMbid)}
          initialWanted
          onRemovedFromWanted={onRemove}
        />
      ))}
    </div>
  );
}
