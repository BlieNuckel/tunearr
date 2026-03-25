import { useState } from "react";
import useLogs from "@/hooks/useLogs";
import LogsTable from "./LogsTable";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import Skeleton from "@/components/Skeleton";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOGS_FILTERS = [
  {
    key: "level",
    label: "Level",
    combineMode: "or" as const,
    options: [
      { value: "info", label: "Info" },
      { value: "warn", label: "Warnings" },
      { value: "error", label: "Errors" },
    ],
  },
];

export default function LogsSection() {
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const level =
    levelFilter.length > 0 ? (levelFilter as LogLevel[]) : undefined;
  const { data, loading, error, refetch } = useLogs({
    page,
    pageSize: 25,
    level,
    search,
  });

  const handleFilterChange = (key: string, values: string[]) => {
    if (key === "level") setLevelFilter(values);
    setPage(1);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
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

      <FilterBar
        filters={LOGS_FILTERS}
        values={{ level: levelFilter }}
        onChange={handleFilterChange}
        search={{
          placeholder: "Search logs by message or label...",
          onSearch: handleSearch,
        }}
      />

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

      {error && !loading && (
        <div className="bg-rose-400 text-white border-2 border-black rounded-xl p-3 text-sm font-medium shadow-cartoon-sm">
          {error}
        </div>
      )}

      {!loading && !error && data && <LogsTable logs={data.logs} />}

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
