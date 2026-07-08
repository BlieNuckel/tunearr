import { useState } from "react";
import useLogs from "@/hooks/useLogs";
import LogsTable from "./LogsTable";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import Skeleton from "@/components/Skeleton";
import RefreshButton from "@/components/RefreshButton";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          System Logs
        </h2>
        <RefreshButton
          onRefresh={refetch}
          loading={loading}
          ariaLabel="Refresh logs"
        />
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
