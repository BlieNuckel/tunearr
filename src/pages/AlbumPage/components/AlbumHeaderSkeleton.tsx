import Skeleton from "@/components/Skeleton";

export default function AlbumHeaderSkeleton() {
  return (
    <div
      data-testid="album-header-skeleton"
      className="flex items-start gap-4 mb-8"
    >
      <Skeleton className="w-28 h-28 sm:w-40 sm:h-40 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
    </div>
  );
}
