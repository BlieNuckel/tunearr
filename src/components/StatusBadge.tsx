const COLORS: Record<string, string> = {
  downloading: "bg-sky-300 text-black dark:text-black",
  imported: "bg-emerald-400 text-black dark:text-black",
  missing: "bg-amber-300 text-black dark:text-black",
  failed: "bg-rose-400 text-white dark:text-white",
  queued: "bg-gray-300 dark:bg-gray-600 text-black dark:text-gray-100",
  monitored: "bg-amber-300 text-black dark:text-black",
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = COLORS[status] || COLORS.queued;
  return (
    <span
      data-testid="status-badge"
      data-status={status}
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border-2 border-black shadow-cartoon-sm ${colorClass}`}
    >
      {status}
    </span>
  );
}
