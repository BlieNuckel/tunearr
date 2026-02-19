const COLORS: Record<string, string> = {
  downloading: "bg-sky-300 text-black",
  imported: "bg-emerald-400 text-black",
  missing: "bg-amber-300 text-black",
  failed: "bg-rose-400 text-white",
  queued: "bg-gray-300 text-black",
  monitored: "bg-amber-300 text-black",
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = COLORS[status] || COLORS.queued;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border-2 border-black shadow-cartoon-sm ${colorClass}`}
    >
      {status}
    </span>
  );
}
