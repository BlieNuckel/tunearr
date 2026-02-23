import { useState, useEffect, useCallback } from "react";
import QueueTable from "./components/QueueTable";
import WantedList from "./components/WantedList";
import RecentImports from "./components/RecentImports";
import Skeleton from "@/components/Skeleton";
import { RefreshIcon } from "@/components/icons";
import { QueueItem, WantedItem, RecentImport } from "@/types";

export default function StatusPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [wanted, setWanted] = useState<WantedItem[]>([]);
  const [history, setHistory] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [queueRes, wantedRes, historyRes] = await Promise.all([
        fetch("/api/lidarr/queue"),
        fetch("/api/lidarr/wanted/missing"),
        fetch("/api/lidarr/history"),
      ]);

      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueue(data.records || []);
      }
      if (wantedRes.ok) {
        const data = await wantedRes.json();
        setWanted(data.records || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.records || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleAlbumSearch = async (albumId: number) => {
    try {
      await fetch("/api/lidarr/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumIds: [albumId] }),
      });
    } catch {
      // Silently fail — user can retry
    }
  };

  const handleAlbumRemove = async (albumMbid: string) => {
    try {
      const res = await fetch("/api/lidarr/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumMbid }),
      });

      if (res.ok) {
        setWanted((prev) =>
          prev.filter((item) => item.foreignAlbumId !== albumMbid)
        );
      }
    } catch {
      // Silently fail — user can retry
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {[...Array(3)].map((_, sectionIndex) => (
          <section key={sectionIndex}>
            <Skeleton className="h-7 w-40 mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-sm"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-rose-500">
        <p>Failed to load status: {error}</p>
        <p className="text-gray-400 text-sm mt-1">
          Make sure Lidarr is configured in Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Download Queue
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh queue"
          >
            <RefreshIcon
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <QueueTable items={queue} />
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Wanted / Missing
        </h2>
        <WantedList
          items={wanted}
          onSearch={handleAlbumSearch}
          onRemove={handleAlbumRemove}
        />
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Recent Imports
        </h2>
        <RecentImports items={history} />
      </section>
    </div>
  );
}
