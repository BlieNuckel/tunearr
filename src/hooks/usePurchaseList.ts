import { useState, useEffect, useCallback } from "react";
import type { PurchaseItem, SpendingSummary } from "@/types";

export default function usePurchaseList() {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [itemsRes, summaryRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/purchases/summary"),
      ]);

      if (!itemsRes.ok) throw new Error("Failed to load purchases");
      if (!summaryRes.ok) throw new Error("Failed to load spending summary");

      const [itemsData, summaryData] = await Promise.all([
        itemsRes.json() as Promise<PurchaseItem[]>,
        summaryRes.json() as Promise<SpendingSummary>,
      ]);

      setItems(itemsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removeItem = useCallback(async (albumMbid: string) => {
    try {
      const res = await fetch(
        `/api/purchases/${encodeURIComponent(albumMbid)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.albumMbid !== albumMbid));
      }
    } catch {
      // Silently fail — user can retry
    }
  }, []);

  return { items, summary, loading, error, removeItem, refresh: fetchData };
}
