import type { LiveEventStatus } from "@/types";
import { STATUS_LABELS } from "@/utils/liveFormat";

/** Shared by every small action on a live date row, so they line up. */
export const LIVE_ROW_BUTTON =
  "shrink-0 text-center text-sm font-semibold px-3 py-1.5 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all";

const BADGE =
  "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border-2 border-black text-black";

/** Cancelled, postponed or rescheduled; nothing for a show still on as planned. */
export function StatusBadge({ status }: { status: LiveEventStatus }) {
  const label = STATUS_LABELS[status];
  if (!label) return null;
  return <span className={`${BADGE} bg-amber-300`}>{label}</span>;
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
      className={`${LIVE_ROW_BUTTON} bg-orange-400 text-black`}
    >
      Tickets
    </a>
  );
}

export function LiveLoadError() {
  return (
    <p className="text-sm text-red-600 dark:text-red-400">
      Could not load live dates
    </p>
  );
}
