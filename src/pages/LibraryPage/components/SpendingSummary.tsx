import { formatCurrency, toMinorUnits, toMajorUnits } from "@shared/currency";
import type { SpendingSummary as SpendingSummaryType } from "@/types";

interface SpendingSummaryProps {
  summary: SpendingSummaryType;
  currency: string;
  monthlyLimit: number | null;
}

interface StreamingService {
  name: string;
  monthlyPriceMajor: number;
}

const STREAMING_SERVICES: StreamingService[] = [
  { name: "Spotify", monthlyPriceMajor: 11.99 },
  { name: "Apple Music", monthlyPriceMajor: 10.99 },
  { name: "Tidal", monthlyPriceMajor: 10.99 },
];

function getStreamingComparison(
  allTimeMinor: number,
  currency: string
): { name: string; months: number } | null {
  const spotify = STREAMING_SERVICES[0];
  const allTimeMajor = toMajorUnits(allTimeMinor, currency);
  const spotifyMinor = toMinorUnits(spotify.monthlyPriceMajor, currency);
  if (allTimeMinor < spotifyMinor) return null;
  return {
    name: spotify.name,
    months: Math.floor(allTimeMajor / spotify.monthlyPriceMajor),
  };
}

function LimitBar({
  spent,
  limit,
  currency,
}: {
  spent: number;
  limit: number;
  currency: string;
}) {
  const pct = Math.min((spent / limit) * 100, 100);
  const overLimit = spent >= limit;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 dark:text-gray-400">
          {formatCurrency(spent, currency)} of {formatCurrency(limit, currency)}
        </span>
        <span
          className={
            overLimit
              ? "text-rose-500 font-bold"
              : "text-gray-400 dark:text-gray-500"
          }
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full border-2 border-black overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${overLimit ? "bg-rose-400" : "bg-emerald-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {overLimit && (
        <p className="text-rose-500 text-xs font-medium mt-1.5">
          You&apos;ve reached your monthly budget!
        </p>
      )}
    </div>
  );
}

function StreamingBadge({ name, months }: { name: string; months: number }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Equivalent to{" "}
        <span className="font-bold text-gray-900 dark:text-gray-100">
          {months}
        </span>{" "}
        {months === 1 ? "month" : "months"} of {name}
      </span>
    </div>
  );
}

export default function SpendingSummary({
  summary,
  currency,
  monthlyLimit,
}: SpendingSummaryProps) {
  const streaming = getStreamingComparison(summary.allTime, currency);
  const hasLimit = monthlyLimit !== null && monthlyLimit > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Monthly support card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md p-4 sm:p-5">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          Supporting artists this month
        </p>
        <p className="text-3xl sm:text-4xl font-black text-emerald-500 dark:text-emerald-400 mt-1">
          {formatCurrency(summary.month, currency)}
        </p>
        {hasLimit && (
          <LimitBar
            spent={summary.month}
            limit={monthlyLimit}
            currency={currency}
          />
        )}
      </div>

      {/* All-time card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md p-4 sm:p-5">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          All-time artist support
        </p>
        <p className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-gray-100 mt-1">
          {formatCurrency(summary.allTime, currency)}
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {summary.albumCount}
              </span>{" "}
              {summary.albumCount === 1 ? "album" : "albums"} purchased
            </span>
          </div>
          {streaming && (
            <StreamingBadge name={streaming.name} months={streaming.months} />
          )}
        </div>
      </div>
    </div>
  );
}
