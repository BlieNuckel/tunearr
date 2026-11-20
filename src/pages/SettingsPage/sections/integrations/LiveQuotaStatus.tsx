import useLiveQuota from "@/hooks/useLiveQuota";
import type { LiveQuotaStatus as QuotaStatus } from "@/types";

interface LiveQuotaStatusProps {
  enabled: boolean;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};

function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, DATE_FORMAT);
}

function usageLine(quota: QuotaStatus): string {
  if (quota.quota === null) {
    return `${quota.used} calls used this period, no monthly cap`;
  }
  const percent = Math.round((quota.ratio ?? 0) * 100);
  return `${quota.used} of ${quota.quota} calls used this period (${percent}%)`;
}

function sourceNote(quota: QuotaStatus): string | null {
  if (quota.source === "local" && quota.checkedAt) {
    return `Could not reach JamBase just now. This is its figure from ${formatDay(quota.checkedAt)} plus calls made since.`;
  }
  return null;
}

export default function LiveQuotaStatus({ enabled }: LiveQuotaStatusProps) {
  const { quota } = useLiveQuota(enabled);
  if (!quota) return null;

  if (quota.source === "unknown") {
    return (
      <div className="rounded-xl border-2 border-black shadow-cartoon-sm p-3 bg-white dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Usage shows up here once JamBase has answered with this key.
        </p>
      </div>
    );
  }

  const note = sourceNote(quota);

  return (
    <div className="rounded-xl border-2 border-black shadow-cartoon-sm p-3 bg-white dark:bg-gray-800 space-y-1">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {usageLine(quota)}
      </p>

      {quota.blocked && (
        <p className="text-sm font-semibold text-rose-500">
          Lookups are paused until the period resets.
        </p>
      )}

      {quota.overageCalls > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {quota.overageCalls} calls past the plan quota, billed by JamBase.
        </p>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {[
          quota.plan &&
            `${quota.plan[0].toUpperCase()}${quota.plan.slice(1)} plan`,
          quota.periodEnd && `resets ${formatDay(quota.periodEnd)}`,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>

      {note && (
        <p className="text-xs text-amber-700 dark:text-amber-300">{note}</p>
      )}
    </div>
  );
}
