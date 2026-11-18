import { useState } from "react";
import {
  COMMON_CURRENCIES,
  toMinorUnits,
  toMajorUnits,
  type SpendingSettings,
} from "@shared/currency";
import useSpendingSettings from "@/hooks/useSpendingSettings";

const INPUT_CLASSES =
  "w-full sm:w-sm px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md";

const LABEL_CLASSES =
  "block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1";

/** The limit typed into the field, in minor units; null for blank, undefined when it can't be saved. */
function parseLimit(
  value: string,
  currency: string
): number | null | undefined {
  if (value.trim() === "") return null;
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < 0) return undefined;
  return toMinorUnits(parsed, currency);
}

function limitDisplay(spending: SpendingSettings): string {
  return spending.monthlyLimit !== null
    ? toMajorUnits(spending.monthlyLimit, spending.currency).toString()
    : "";
}

export default function SpendingSection() {
  const { spending, loading, error, save } = useSpendingSettings();
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading && !spending) return null;

  const submit = async (patch: Partial<SpendingSettings>) => {
    setSaveError(await save(patch));
  };

  const handleLimitBlur = (value: string) => {
    if (!spending) return;
    const limit = parseLimit(value, spending.currency);
    if (limit === undefined || limit === spending.monthlyLimit) return;
    void submit({ monthlyLimit: limit });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Spending
      </h2>

      {error && !spending && (
        <p className="text-rose-500 text-xs">
          Could not load your spending settings
        </p>
      )}
      {saveError && <p className="text-rose-500 text-xs">{saveError}</p>}

      {spending && (
        <>
          <div>
            <label htmlFor="spending-currency" className={LABEL_CLASSES}>
              Currency
            </label>
            <select
              id="spending-currency"
              value={spending.currency}
              onChange={(e) => void submit({ currency: e.target.value })}
              className={INPUT_CLASSES}
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Your spending summary counts only purchases in this currency.
              Changing it won&apos;t convert existing purchase records
            </p>
          </div>

          <div>
            <label htmlFor="spending-limit" className={LABEL_CLASSES}>
              Monthly Spending Limit
            </label>
            <input
              id="spending-limit"
              key={`${spending.currency}:${spending.monthlyLimit}`}
              type="number"
              min="0"
              step="any"
              defaultValue={limitDisplay(spending)}
              onBlur={(e) => handleLimitBlur(e.target.value)}
              placeholder="No limit"
              className={INPUT_CLASSES}
            />
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Soft limit — shows a warning in your Purchases tab when exceeded
            </p>
          </div>
        </>
      )}
    </div>
  );
}
