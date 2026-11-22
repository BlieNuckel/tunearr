import Modal from "@/components/Modal";
import useAsyncData, { type FetchContext } from "@/hooks/useAsyncData";
import { formatCurrency } from "@shared/currency";
import type { SpendingSummary } from "@/types";
import ModalHeader from "@/components/ModalHeader";
import { SECONDARY_BUTTON } from "@/components/buttonStyles";

interface CurrencyChangeConfirmProps {
  /** The currency being switched to; null while closed. */
  to: string | null;
  from: string;
  monthlyLimit: number | null;
  onConfirm: (currency: string) => void;
  onCancel: () => void;
}

const PRIMARY_BUTTON_CLASSES =
  "w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 px-4 rounded-xl border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all";

async function fetchPurchaseCount({ signal }: FetchContext): Promise<number> {
  const res = await fetch("/api/purchases/summary", { signal });
  if (!res.ok) throw new Error("Failed to load spending summary");
  const summary = (await res.json()) as SpendingSummary;
  return summary.albumCount;
}

function purchasesSentence(count: number | null, from: string): string | null {
  if (count === 0) return null;
  const subject =
    count === null
      ? `Purchases recorded in ${from}`
      : count === 1
        ? `Your 1 purchase recorded in ${from}`
        : `Your ${count} purchases recorded in ${from}`;
  const verb = count === 1 ? "It" : "They";
  return `${subject} will no longer count toward your totals or your monthly limit. ${verb} won't be converted.`;
}

function limitSentence(
  monthlyLimit: number | null,
  from: string,
  to: string
): string | null {
  if (monthlyLimit === null) return null;
  return `Your monthly limit of ${formatCurrency(monthlyLimit, from)} will be cleared. You can set a new one in ${to}.`;
}

/** Asks before moving a user off a currency they already record purchases in. */
export default function CurrencyChangeConfirm({
  to,
  from,
  monthlyLimit,
  onConfirm,
  onCancel,
}: CurrencyChangeConfirmProps) {
  const { data: count, loading } = useAsyncData<number>(
    to ? `purchase-count:${from}` : null,
    fetchPurchaseCount
  );

  const sentences = to
    ? [
        loading ? null : purchasesSentence(count, from),
        limitSentence(monthlyLimit, from, to),
      ].filter((s): s is string => s !== null)
    : [];

  return (
    <Modal isOpen={to !== null} onClose={onCancel}>
      <div className="space-y-4">
        <ModalHeader title={`Switch to ${to}?`} />
        {sentences.map((s) => (
          <p key={s} className="text-gray-500 dark:text-gray-400 text-sm">
            {s}
          </p>
        ))}
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          New purchases will be recorded in {to}.
        </p>
        <button
          onClick={() => to && onConfirm(to)}
          className={PRIMARY_BUTTON_CLASSES}
        >
          Switch to {to}
        </button>
        <button onClick={onCancel} className={`w-full ${SECONDARY_BUTTON}`}>
          Keep {from}
        </button>
      </div>
    </Modal>
  );
}
