import { useState, useEffect, useCallback } from "react";
import QueueTable from "./components/QueueTable";
import WantedList from "./components/WantedList";
import RecentImports from "./components/RecentImports";
import { QueueItem, WantedItem, RecentImport } from "@/types";

export default function StatusPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [wanted, setWanted] = useState<WantedItem[]>([]);
  const [history, setHistory] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [queueRes, wantedRes, historyRes] = await Promise.all([
        fetch("/api/lidarr/queue"),
        fetch("/api/lidarr/wanted/missing"),
        fetch("/api/lidarr/history?eventType=3"),
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

  const handleAlbumSearch = async (albumId: number) => {
    try {
      await fetch("/api/lidarr/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "AlbumSearch", albumIds: [albumId] }),
      });
    } catch {
      // Silently fail — user can retry
    }
  };

  if (loading) {
    return <p className="text-gray-500">Loading status...</p>;
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
        <h2 className="text-xl font-bold text-gray-900 mb-4">Download Queue</h2>
        <QueueTable items={queue} />
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Wanted / Missing</h2>
        <WantedList items={wanted} onSearch={handleAlbumSearch} />
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Imports</h2>
        <RecentImports items={history} />
      </section>
    </div>
  );
}
