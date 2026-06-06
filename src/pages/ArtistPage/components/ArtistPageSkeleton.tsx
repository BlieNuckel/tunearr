import Skeleton from "@/components/Skeleton";

export default function ArtistPageSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-4 w-24 mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden"
          >
            <Skeleton className="aspect-square rounded-none" />
            <div className="p-3 border-t-2 border-black space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
