import { Link } from "react-router-dom";
import Skeleton from "@/components/Skeleton";
import {
  LIVE_ROW_BUTTON,
  LiveLoadError,
} from "@/components/live/LiveEventBits";
import { artistTourPath } from "@/utils/artistTour";

export function AllDatesLink({ artistMbid }: { artistMbid: string }) {
  return (
    <Link
      to={artistTourPath(artistMbid)}
      className={`${LIVE_ROW_BUTTON} bg-white text-black dark:bg-gray-700 dark:text-gray-100`}
    >
      All dates
    </Link>
  );
}

/** Loading, failure and empty states, shared by both live views. */
export function LiveListStatus({
  loading,
  error,
  isEmpty,
  emptyMessage,
}: {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage: string;
}) {
  if (error) return <LiveLoadError />;
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!isEmpty) return null;
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
  );
}
