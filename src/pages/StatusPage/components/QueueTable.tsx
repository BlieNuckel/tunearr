import StatusBadge from "@/components/StatusBadge";
import { QueueItem } from "@/types";

interface QueueTableProps {
  items: QueueItem[];
}

function formatProgress(item: QueueItem): string {
  if (!item.sizeleft || !item.size) return "—";
  return `${Math.round(((item.size - item.sizeleft) / item.size) * 100)}%`;
}

export default function QueueTable({ items }: QueueTableProps) {
  if (items.length === 0) {
    return <p className="text-gray-400 text-sm">No active downloads.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="stagger-fade-in flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all"
          style={{ "--stagger-index": index } as React.CSSProperties}
        >
          <div>
            <p className="text-gray-900 dark:text-gray-100 font-medium">
              {item.album?.title || item.title || "Unknown"}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {item.artist?.artistName || "Unknown"}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {item.quality?.quality?.name || "—"} · {formatProgress(item)}
            </p>
          </div>
          <StatusBadge
            status={
              item.trackedDownloadStatus?.toLowerCase() || "downloading"
            }
          />
        </div>
      ))}
    </div>
  );
}
