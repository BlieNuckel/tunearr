function PermissionBadge({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border transition-all";
  const colors = active
    ? "bg-pink-400 text-black border-black"
    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 border-black/20 dark:border-white/20 opacity-50";

  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} ${colors} cursor-pointer`}>
        {label}
      </button>
    );
  }

  return <span className={`${base} ${colors}`}>{label}</span>;
}

export default PermissionBadge;
