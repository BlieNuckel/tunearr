import useGoingShows from "@/hooks/useGoingShows";
import type { LiveEventSummary } from "@/types";
import { LiveListStatus, StatusBadge, TicketsLink } from "./LiveEventBits";
import { headliner, whereAndWhen } from "./liveFormat";

function GoingRow({ event }: { event: LiveEventSummary }) {
  return (
    <li className="flex items-start justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {headliner(event)}
          </span>
          <StatusBadge status={event.status} />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {whereAndWhen(event)}
        </p>
      </div>
      <TicketsLink url={event.ticketUrl} />
    </li>
  );
}

/** The shows the user said they are going to, soonest first. */
export default function GoingList() {
  const { events, loading, error } = useGoingShows();

  return (
    <>
      <LiveListStatus
        loading={loading}
        error={error}
        isEmpty={events.length === 0}
        emptyMessage="You haven't marked any shows as going"
      />
      {!loading && events.length > 0 && (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <GoingRow key={event.eventKey} event={event} />
          ))}
        </ul>
      )}
    </>
  );
}
