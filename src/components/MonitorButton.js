const STATES = {
  idle: {
    label: "Add to Lidarr",
    className: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  adding: {
    label: "Adding...",
    className: "bg-indigo-800 text-indigo-300 cursor-wait",
  },
  success: {
    label: "Added",
    className: "bg-green-600/20 text-green-400 cursor-default",
  },
  already_monitored: {
    label: "Already Monitored",
    className: "bg-gray-600/20 text-gray-400 cursor-default",
  },
  error: {
    label: "Error",
    className: "bg-red-600/20 text-red-400",
  },
};

/**
 * @param {{ state: keyof typeof STATES, onClick: () => void, errorMsg?: string }} props
 */
export default function MonitorButton({ state, onClick, errorMsg }) {
  const config = STATES[state] || STATES.idle;
  const disabled = state === "adding" || state === "success" || state === "already_monitored";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${config.className}`}
      >
        {config.label}
      </button>
      {state === "error" && errorMsg && (
        <p className="text-red-400 text-xs max-w-48 text-right">{errorMsg}</p>
      )}
    </div>
  );
}
