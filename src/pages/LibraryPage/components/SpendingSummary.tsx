import { formatCurrency } from "@shared/currency";
import type { SpendingSummary as SpendingSummaryType } from "@/types";

interface SpendingSummaryProps {
  summary: SpendingSummaryType;
  currency: string;
  monthlyLimit: number | null;
}

interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm p-3 sm:p-4">
      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-lg sm:text-xl font-bold mt-1 ${highlight ? "text-rose-500" : "text-gray-900 dark:text-gray-100"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function SpendingSummary({
  summary,
  currency,
  monthlyLimit,
}: SpendingSummaryProps) {
  const overLimit =
    monthlyLimit !== null && monthlyLimit > 0 && summary.month >= monthlyLimit;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="This week"
          value={formatCurrency(summary.week, currency)}
        />
        <StatCard
          label="This month"
          value={formatCurrency(summary.month, currency)}
          highlight={overLimit}
        />
        <StatCard
          label="This year"
          value={formatCurrency(summary.year, currency)}
        />
        <StatCard
          label="All time"
          value={formatCurrency(summary.allTime, currency)}
        />
      </div>

      {overLimit && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-300 dark:border-rose-700 rounded-xl px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          Monthly spending ({formatCurrency(summary.month, currency)}) has
          reached your limit of {formatCurrency(monthlyLimit, currency)}
        </div>
      )}
    </div>
  );
}
