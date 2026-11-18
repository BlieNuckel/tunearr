import Skeleton from "@/components/Skeleton";

export default function ArtistHeaderSkeleton() {
  return (
    <div
      data-testid="artist-header-skeleton"
      className="flex items-center gap-4 mb-8"
    >
      <Skeleton className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}
