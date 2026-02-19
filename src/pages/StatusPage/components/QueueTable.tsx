import StatusBadge from "@/components/StatusBadge";
import { QueueItem } from "@/types";

interface QueueTableProps {
  items: QueueItem[];
}

export default function QueueTable({ items }: QueueTableProps) {
  if (items.length === 0) {
    return <p className="text-gray-400 text-sm">No active downloads.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b-2 border-black">
            <th className="pb-2 font-bold">Artist</th>
            <th className="pb-2 font-bold">Album</th>
            <th className="pb-2 font-bold">Quality</th>
            <th className="pb-2 font-bold">Progress</th>
            <th className="pb-2 font-bold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-gray-200">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 text-gray-600">
                {item.artist?.artistName || "Unknown"}
              </td>
              <td className="py-2 text-gray-900">
                {item.album?.title || item.title || "Unknown"}
              </td>
              <td className="py-2 text-gray-500">
                {item.quality?.quality?.name || "—"}
              </td>
              <td className="py-2 text-gray-600">
                {item.sizeleft != null && item.size
                  ? `${Math.round(((item.size - item.sizeleft) / item.size) * 100)}%`
                  : "—"}
              </td>
              <td className="py-2">
                <StatusBadge
                  status={
                    item.trackedDownloadStatus?.toLowerCase() || "downloading"
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
