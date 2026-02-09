const COLORS = {
  downloading: "bg-blue-500/20 text-blue-400",
  imported: "bg-green-500/20 text-green-400",
  missing: "bg-yellow-500/20 text-yellow-400",
  failed: "bg-red-500/20 text-red-400",
  queued: "bg-gray-500/20 text-gray-400",
  monitored: "bg-indigo-500/20 text-indigo-400",
};

/**
 * @param {{ status: string }} props
 */
export default function StatusBadge({ status }) {
  const colorClass = COLORS[status] || COLORS.queued;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {status}
    </span>
  );
}
