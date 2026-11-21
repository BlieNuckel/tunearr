import { useState } from "react";
import TourList from "./live/TourList";
import GoingList from "./live/GoingList";

type LiveView = "upcoming" | "going";

const VIEWS: { id: LiveView; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "going", label: "Going" },
];

export default function LiveList() {
  const [view, setView] = useState<LiveView>("upcoming");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {VIEWS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => setView(option.id)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all ${
              view === option.id
                ? "bg-orange-400 text-black"
                : "bg-white dark:bg-gray-700 dark:text-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === "upcoming" ? <TourList /> : <GoingList />}
    </div>
  );
}
