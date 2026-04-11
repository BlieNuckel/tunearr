import { useState } from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useSettings } from "@/context/useSettings";
import { DEFAULT_SPENDING } from "@/context/spendingDefaults";
import {
  toMinorUnits,
  getMinorUnitExponent,
  COMMON_CURRENCIES,
} from "@shared/currency";

interface PurchasePriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  albumTitle: string;
  onConfirm: (price: number, currency: string) => void;
  saving?: boolean;
}

function getCurrencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

export default function PurchasePriceModal({
  isOpen,
  onClose,
  artistName,
  albumTitle,
  onConfirm,
  saving = false,
}: PurchasePriceModalProps) {
  const { settings } = useSettings();
  const spending = settings.spending ?? DEFAULT_SPENDING;

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(spending.currency);

  const exponent = getMinorUnitExponent(currency);
  const step = exponent > 0 ? `0.${"0".repeat(exponent - 1)}1` : "1";

  const parsed = parseFloat(amount);
  const isValid = !isNaN(parsed) && parsed >= 0 && amount !== "";

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(toMinorUnits(parsed, currency), currency);
    setAmount("");
    onClose();
  };

  const handleClose = () => {
    setAmount("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Record Purchase
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {albumTitle} by {artistName}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="number"
                min="0"
                step={step}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) handleConfirm();
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-black space-y-2">
          <button
            onClick={handleConfirm}
            disabled={!isValid || saving}
            className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 text-black font-bold py-3 px-4 rounded-xl border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed disabled:shadow-cartoon-sm disabled:translate-y-0 transition-all flex items-center justify-center gap-2"
          >
            {saving && <Spinner />}
            Record Purchase
          </button>
          <button
            onClick={handleClose}
            className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
