const states = {
  idle: {
    label: "Request",
    className:
      "bg-amber-300 hover:bg-amber-200 text-black dark:text-black border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all",
  },
  adding: {
    label: "Requesting...",
    className:
      "bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-2 border-black shadow-cartoon-sm cursor-wait",
  },
  success: {
    label: "Requested",
    className:
      "bg-emerald-400 text-black dark:text-black border-2 border-black shadow-cartoon-sm cursor-default",
  },
  already_monitored: {
    label: "Monitored",
    className:
      "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-2 border-black shadow-cartoon-sm cursor-default",
  },
  error: {
    label: "Error",
    className:
      "bg-rose-400 text-white dark:text-white border-2 border-black shadow-cartoon-sm",
  },
};

export { states };
