import { useState, FormEvent } from "react";
import useLogs from "@/hooks/useLogs";
import LogsTable from "./LogsTable";
import Pagination from "@/components/Pagination";
import Skeleton from "@/components/Skeleton";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_OPTIONS: { value: LogLevel | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warnings" },
  { value: "error", label: "Errors" },
];

export default function LogsSection() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<LogLevel | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, loading, error, refetch } = useLogs({
    page,
    pageSize: 25,
    level,
    search,
  });

  const handleLevelChange = (newLevel: LogLevel | "all") => {
    setLevel(newLevel === "all" ? undefined : newLevel);
    setPage(1);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          System Logs
        </h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-black rounded-lg shadow-cartoon-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          aria-label="Refresh logs"
        >
          {/* Refresh icon */}
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
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
      </div>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search logs by message or label..."
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-400 shadow-cartoon-md text-[16px]"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          Search
        </button>
      </form>

      {/* Level filter buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {LEVEL_OPTIONS.map((option) => {
          const isActive =
            option.value === "all" ? !level : level === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleLevelChange(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all whitespace-nowrap ${
                isActive
                  ? "bg-amber-400 text-black"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && !loading && (
        <div className="bg-rose-400 text-white border-2 border-black rounded-xl p-3 text-sm font-medium shadow-cartoon-sm">
          {error}
        </div>
      )}

      {/* Logs table */}
      {!loading && !error && data && <LogsTable logs={data.logs} />}

      {/* Pagination */}
      {!loading && !error && data && data.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
