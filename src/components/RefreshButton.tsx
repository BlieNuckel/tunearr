import { useState } from "react";

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  ariaLabel?: string;
}

export default function RefreshButton({
  onRefresh,
  loading = false,
  ariaLabel = "Refresh",
}: RefreshButtonProps) {
  const [pending, setPending] = useState(false);
  const busy = loading || pending;

  const handleClick = async () => {
    setPending(true);
    try {
      await onRefresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="px-3 py-1.5 text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-black rounded-lg shadow-cartoon-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
      aria-label={ariaLabel}
    >
      <svg
        className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      Refresh
    </button>
  );
}
