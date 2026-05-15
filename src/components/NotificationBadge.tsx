type NotificationBadgeProps = {
  count: number;
  className?: string;
};

export default function NotificationBadge({
  count,
  className = "",
}: NotificationBadgeProps) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      data-testid="notification-badge"
      aria-label={`${count} new`}
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold rounded-full border-2 border-black bg-rose-400 text-black shadow-cartoon-sm ${className}`}
    >
      {label}
    </span>
  );
}
