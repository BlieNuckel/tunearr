import Skeleton from "@/components/Skeleton";

interface HighlightsSkeletonProps {
  desktop: boolean;
}

export default function HighlightsSkeleton({
  desktop,
}: HighlightsSkeletonProps) {
  if (desktop) {
    return (
      <div
        role="status"
        aria-label="Loading highlights"
        className="grid grid-cols-3 gap-4 h-72"
      >
        <Skeleton className="col-span-2 h-full rounded-xl" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((slot) => (
            <Skeleton key={slot} className="h-[5.5rem] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-label="Loading highlights">
      <Skeleton className="h-96 w-[85%] rounded-xl" />
    </div>
  );
}
