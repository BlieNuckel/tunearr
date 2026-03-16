import type { SaveStatus } from "@/hooks/useAutoSave";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  error: string | null;
}

export default function SaveStatusIndicator({
  status,
  error,
}: SaveStatusIndicatorProps) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Saving...
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Saved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400">
      Save failed{error ? `: ${error}` : ""}
    </span>
  );
}
