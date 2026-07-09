import { RefreshIcon } from "@/components/icons";

interface ShuffleButtonProps {
  onClick: () => void;
  disabled: boolean;
  spinning: boolean;
  ariaLabel: string;
}

export default function ShuffleButton({
  onClick,
  disabled,
  spinning,
  ariaLabel,
}: ShuffleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={ariaLabel}
    >
      <RefreshIcon className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Shuffle</span>
    </button>
  );
}
