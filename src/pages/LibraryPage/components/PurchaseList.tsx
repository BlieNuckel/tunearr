import Skeleton from "@/components/Skeleton";
import PurchaseCard from "@/components/PurchaseCard";
import type { PurchaseItem } from "@/types";

interface PurchaseListProps {
  items: PurchaseItem[];
  loading: boolean;
  error: string | null;
  onRemove: (albumMbid: string) => void | Promise<void>;
}

export default function PurchaseList({
  items,
  loading,
  error,
  onRemove,
}: PurchaseListProps) {
  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="text-rose-500">
        <p>Failed to load purchases: {error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm">No purchases recorded yet</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => (
        <PurchaseCard key={item.albumMbid} item={item} onRemove={onRemove} />
      ))}
    </div>
  );
}
