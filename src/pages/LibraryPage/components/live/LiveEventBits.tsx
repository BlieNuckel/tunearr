import { Link } from "react-router-dom";
import Skeleton from "@/components/Skeleton";
import type { LiveEventStatus } from "@/types";
import { STATUS_LABELS } from "./liveFormat";

const ROW_BUTTON =
  "shrink-0 text-center text-sm font-semibold px-3 py-1.5 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all";

const BADGE =
  "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border-2 border-black text-black";

/** Cancelled, postponed or rescheduled; nothing for a show still on as planned. */
export function StatusBadge({ status }: { status: LiveEventStatus }) {
  const label = STATUS_LABELS[status];
  if (!label) return null;
  return <span className={`${BADGE} bg-amber-300`}>{label}</span>;
}

export function AllDatesLink({ artistMbid }: { artistMbid: string }) {
  return (
    <Link
      to={`/artist/${artistMbid}`}
      className={`${ROW_BUTTON} bg-white text-black dark:bg-gray-700 dark:text-gray-100`}
    >
      All dates
    </Link>
  );
}

export function GoingBadge() {
  return <span className={`${BADGE} bg-emerald-300`}>Going</span>;
}

export function TicketsLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={`${ROW_BUTTON} bg-orange-400 text-black`}
    >
      Tickets
    </a>
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
  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Could not load live dates
      </p>
    );
  }
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
