import Skeleton from "@/components/Skeleton";
import PurchaseCard from "@/components/PurchaseCard";
import SpendingSummary from "./SpendingSummary";
import { useSettings } from "@/context/useSettings";
import { DEFAULT_SPENDING } from "@/context/spendingDefaults";
import type {
  PurchaseItem,
  SpendingSummary as SpendingSummaryType,
} from "@/types";

interface PurchaseListProps {
  items: PurchaseItem[];
  summary: SpendingSummaryType | null;
  loading: boolean;
  error: string | null;
  onRemove: (albumMbid: string) => void | Promise<void>;
}

export default function PurchaseList({
  items,
  summary,
  loading,
  error,
  onRemove,
}: PurchaseListProps) {
  const { settings } = useSettings();
  const spending = settings.spending ?? DEFAULT_SPENDING;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden"
            >
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-rose-500">
        <p>Failed to load purchases: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary && (
        <SpendingSummary
          summary={summary}
          currency={spending.currency}
          monthlyLimit={spending.monthlyLimit}
        />
      )}

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm">No purchases recorded yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item) => (
            <PurchaseCard
              key={item.albumMbid}
              item={item}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
