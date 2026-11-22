import {
  StatusBadge,
  TicketsLink,
} from "@/pages/LibraryPage/components/live/LiveEventBits";
import { formatDate } from "@/pages/LibraryPage/components/live/liveFormat";
import type { LiveEventSummary, LiveTrackingState } from "@/types";

interface ArtistLiveDatesProps {
  dates: LiveEventSummary[];
  /** null when nobody follows this artist, so there is nothing to report. */
  tracking: LiveTrackingState | null;
}

/**
 * An empty list means three different things, and conflating them is the whole
 * problem: "not looked yet", "looked, nothing on sale", and "we will never find
 * anything for this artist".
 */
const EMPTY_MESSAGES: Record<LiveTrackingState, string> = {
  pending: "Checking for live dates…",
  tracked: "No upcoming dates.",
  unavailable:
    "Our live events source has no listing for this artist, so no dates will show up here. It is a gap in the data, not a quiet touring year.",
};

function EmptyMessage({ tracking }: { tracking: LiveTrackingState | null }) {
  const state = tracking ?? "tracked";
  const tone =
    state === "unavailable"
      ? "text-amber-700 dark:text-amber-300"
      : "text-gray-500 dark:text-gray-400";
  return <p className={`text-sm ${tone}`}>{EMPTY_MESSAGES[state]}</p>;
}

/** Every upcoming date in date order, or why there are none. */
export default function ArtistLiveDates({
  dates,
  tracking,
}: ArtistLiveDatesProps) {
  if (dates.length === 0) return <EmptyMessage tracking={tracking} />;

  return (
    <ul className="flex flex-col gap-2">
      {dates.map((event) => (
        <li
          key={event.eventKey}
          className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm px-3 py-2"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatDate(event.eventDate)}
              </span>
              <StatusBadge status={event.status} />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {[event.venueName, event.venueCity, event.venueCountry]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <TicketsLink url={event.ticketUrl} />
        </li>
      ))}
    </ul>
  );
}
