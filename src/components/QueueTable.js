import StatusBadge from "./StatusBadge";

/**
 * @param {{ items: Array<object> }} props
 */
export default function QueueTable({ items }) {
  if (items.length === 0) {
    return <p className="text-gray-500 text-sm">No active downloads.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 font-medium">Artist</th>
            <th className="pb-2 font-medium">Album</th>
            <th className="pb-2 font-medium">Quality</th>
            <th className="pb-2 font-medium">Progress</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 text-gray-300">
                {item.artist?.artistName || "Unknown"}
              </td>
              <td className="py-2 text-white">
                {item.album?.title || item.title || "Unknown"}
              </td>
              <td className="py-2 text-gray-400">
                {item.quality?.quality?.name || "—"}
              </td>
              <td className="py-2 text-gray-300">
                {item.sizeleft != null && item.size
                  ? `${Math.round(((item.size - item.sizeleft) / item.size) * 100)}%`
                  : "—"}
              </td>
              <td className="py-2">
                <StatusBadge
                  status={item.trackedDownloadStatus?.toLowerCase() || "downloading"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
