import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "./Modal";
import Spinner from "./Spinner";
import useSpendingSettings from "@/hooks/useSpendingSettings";
import { toMinorUnits, getMinorUnitExponent } from "@shared/currency";
import ModalHeader from "./ModalHeader";
import { SECONDARY_BUTTON } from "./buttonStyles";

interface PurchasePriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  albumTitle: string;
  onConfirm: (price: number) => void;
  saving?: boolean;
}

interface PriceFormProps {
  currency: string;
  artistName: string;
  albumTitle: string;
  onConfirm: (price: number) => void;
  onClose: () => void;
  saving: boolean;
}

const PRIMARY_BUTTON_CLASSES =
  "w-full bg-emerald-400 hover:bg-emerald-300 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 text-black font-bold py-3 px-4 rounded-xl border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed disabled:shadow-cartoon-sm disabled:translate-y-0 transition-all flex items-center justify-center gap-2";

function getCurrencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

function stepFor(currency: string): string {
  const exponent = getMinorUnitExponent(currency);
  return exponent > 0 ? `0.${"0".repeat(exponent - 1)}1` : "1";
}

function SetupPurchasesState({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <ModalHeader title="Set up purchases" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Choose the currency you buy music in before recording a purchase. Every
        purchase is recorded in it, so your totals add up.
      </p>
      <Link
        to="/settings/general"
        onClick={onClose}
        className={`block ${PRIMARY_BUTTON_CLASSES}`}
      >
        Go to settings
      </Link>
      <button onClick={onClose} className={`w-full ${SECONDARY_BUTTON}`}>
        Cancel
      </button>
    </div>
  );
}

function PriceForm({
  currency,
  artistName,
  albumTitle,
  onConfirm,
  onClose,
  saving,
}: PriceFormProps) {
  const [amount, setAmount] = useState("");

  const parsed = parseFloat(amount);
  const isValid = !isNaN(parsed) && parsed >= 0 && amount !== "";

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(toMinorUnits(parsed, currency));
    onClose();
  };

  return (
    <div className="space-y-4">
      <ModalHeader
        title="Record Purchase"
        subtitle={`${albumTitle} by ${artistName}`}
      />

      <div>
        <label
          htmlFor="purchase-price"
          className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1"
        >
          Price ({currency})
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">
            {getCurrencySymbol(currency)}
          </span>
          <input
            id="purchase-price"
            type="number"
            min="0"
            step={stepFor(currency)}
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

      <div className="pt-4 border-t-2 border-black space-y-2">
        <button
          onClick={handleConfirm}
          disabled={!isValid || saving}
          className={PRIMARY_BUTTON_CLASSES}
        >
          {saving && <Spinner />}
          Record Purchase
        </button>
        <button onClick={onClose} className={`w-full ${SECONDARY_BUTTON}`}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Purchases are always recorded in the user's own currency; until they pick one, this points them to settings. */
export default function PurchasePriceModal({
  isOpen,
  onClose,
  artistName,
  albumTitle,
  onConfirm,
  saving = false,
}: PurchasePriceModalProps) {
  const { spending, error } = useSpendingSettings(isOpen);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {spending === null ? (
        error ? (
          <p className="text-rose-500 text-sm">
            Could not load your purchase settings
          </p>
        ) : (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )
      ) : spending.currency === null ? (
        <SetupPurchasesState onClose={onClose} />
      ) : (
        <PriceForm
          currency={spending.currency}
          artistName={artistName}
          albumTitle={albumTitle}
          onConfirm={onConfirm}
          onClose={onClose}
          saving={saving}
        />
      )}
    </Modal>
  );
}
