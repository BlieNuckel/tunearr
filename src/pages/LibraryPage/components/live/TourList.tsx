import { Link } from "react-router-dom";
import useLiveTours from "@/hooks/useLiveTours";
import type { LiveTourSummary } from "@/types";
import {
  GoingBadge,
  StatusBadge,
  TicketsLink,
} from "@/components/live/LiveEventBits";
import { whereAndWhen } from "@/utils/liveFormat";
import { AllDatesLink, LiveListStatus } from "./LiveEventBits";

/** Says whether the date shown is the closest or just the next one, and how far. */
function tourLine(tour: LiveTourSummary): string {
  const which =
    tour.dateCount === 1
      ? "Only date announced"
      : `${tour.distanceKm === null ? "Next" : "Closest"} of ${tour.dateCount} dates`;
  if (tour.distanceKm === null) return which;
  return `${which} · ${Math.round(tour.distanceKm)} km away`;
}

function TourRow({ tour }: { tour: LiveTourSummary }) {
  return (
    <li className="flex items-start justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/artist/${tour.artistMbid}`}
            className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:underline"
          >
            {tour.artistName}
          </Link>
          <StatusBadge status={tour.closest.status} />
          {tour.closest.response === "going" && <GoingBadge />}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {whereAndWhen(tour.closest)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {tourLine(tour)}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <TicketsLink url={tour.closest.ticketUrl} />
        <AllDatesLink artistMbid={tour.artistMbid} />
      </div>
    </li>
  );
}

function SetLocationHint() {
  return (
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Showing each artist's next date.{" "}
      <Link
        to="/settings/general"
        className="font-semibold text-gray-900 dark:text-gray-100 underline"
      >
        Set your location
      </Link>{" "}
      to see the closest instead.
    </p>
  );
}

/** Every followed artist with dates, one row each, nearest tour first. */
export default function TourList() {
  const { tours, hasLocation, loading, error } = useLiveTours();

  return (
    <>
      {!loading && !error && !hasLocation && tours.length > 0 && (
        <SetLocationHint />
      )}
      <LiveListStatus
        loading={loading}
        error={error}
        isEmpty={tours.length === 0}
        emptyMessage="No artists you follow have upcoming dates"
      />
      {!loading && tours.length > 0 && (
        <ul className="flex flex-col gap-2">
          {tours.map((tour) => (
            <TourRow key={tour.artistMbid} tour={tour} />
          ))}
        </ul>
      )}
    </>
  );
}
