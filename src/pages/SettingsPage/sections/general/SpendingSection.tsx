import {
  COMMON_CURRENCIES,
  toMinorUnits,
  toMajorUnits,
} from "@shared/currency";
import type { SpendingSettings } from "@/context/settingsContextDef";
import { DEFAULT_SPENDING } from "@/context/spendingDefaults";

interface SpendingSectionProps {
  spending: SpendingSettings | undefined;
  onSpendingChange: (spending: SpendingSettings) => void;
}

export default function SpendingSection({
  spending,
  onSpendingChange,
}: SpendingSectionProps) {
  const current = spending ?? DEFAULT_SPENDING;

  const handleCurrencyChange = (currency: string) => {
    onSpendingChange({ ...current, currency });
  };

  const handleLimitChange = (value: string) => {
    if (value === "") {
      onSpendingChange({ ...current, monthlyLimit: null });
      return;
    }
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      onSpendingChange({
        ...current,
        monthlyLimit: toMinorUnits(parsed, current.currency),
      });
    }
  };

  const limitDisplay =
    current.monthlyLimit !== null
      ? toMajorUnits(current.monthlyLimit, current.currency).toString()
      : "";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Spending
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Currency
        </label>
        <select
          value={current.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="w-full sm:w-sm px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        >
          {COMMON_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Changing currency won&apos;t convert existing purchase records
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Monthly Spending Limit
        </label>
        <input
          type="number"
          min="0"
          step="any"
          value={limitDisplay}
          onChange={(e) => handleLimitChange(e.target.value)}
          placeholder="No limit"
          className="w-full sm:w-sm px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Soft limit — shows a warning in your Purchases tab when exceeded
        </p>
      </div>
    </div>
  );
}
