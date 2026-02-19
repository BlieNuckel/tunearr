const states = {
  idle: {
    label: "Add to Lidarr",
    className:
      "bg-amber-300 hover:bg-amber-200 text-black border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all",
  },
  adding: {
    label: "Adding...",
    className:
      "bg-amber-200 text-amber-700 border-2 border-black shadow-cartoon-sm cursor-wait",
  },
  success: {
    label: "Added",
    className:
      "bg-emerald-400 text-black border-2 border-black shadow-cartoon-sm cursor-default",
  },
  already_monitored: {
    label: "Already Monitored",
    className:
      "bg-gray-200 text-gray-500 border-2 border-black shadow-cartoon-sm cursor-default",
  },
  error: {
    label: "Error",
    className:
      "bg-rose-400 text-white border-2 border-black shadow-cartoon-sm",
  },
};

export { states };
