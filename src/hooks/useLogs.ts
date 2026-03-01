import { useState, useEffect, useCallback } from "react";

type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  label: string;
  message: string;
  data?: unknown;
};

type LogsResponse = {
  logs: LogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type UseLogsParams = {
  page: number;
  pageSize: number;
  level?: LogLevel;
  search?: string;
};

export default function useLogs({
  page,
  pageSize,
  level,
  search,
}: UseLogsParams) {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (level) {
        params.append("level", level);
      }

      if (search) {
        params.append("search", search);
      }

      const res = await fetch(`/api/logs?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to fetch logs");
      }

      const responseData = await res.json();
      setData(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, level, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { data, loading, error, refetch: fetchLogs };
}
