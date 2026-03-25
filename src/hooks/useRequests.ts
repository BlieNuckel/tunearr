import { useState, useEffect, useCallback } from "react";
import { RequestItem } from "@/types";

type UseRequestsOptions = {
  userId?: number;
  status?: string[];
};

type UseRequestsReturn = {
  requests: RequestItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approveRequest: (id: number) => Promise<void>;
  declineRequest: (id: number) => Promise<void>;
};

function buildUrl(options: UseRequestsOptions): string {
  const params = new URLSearchParams();
  if (options.userId !== undefined) {
    params.set("userId", String(options.userId));
  }
  if (options.status) {
    for (const s of options.status) {
      params.append("status", s);
    }
  }
  const qs = params.toString();
  return qs ? `/api/requests?${qs}` : "/api/requests";
}

export function useRequests({
  userId,
  status,
}: UseRequestsOptions = {}): UseRequestsReturn {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(buildUrl({ userId, status }));
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [userId, status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const refresh = useCallback(async () => {
    await fetchRequests();
  }, [fetchRequests]);

  const approveRequest = useCallback(async (id: number) => {
    const res = await fetch(`/api/requests/${id}/approve`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to approve request");
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
  }, []);

  const declineRequest = useCallback(async (id: number) => {
    const res = await fetch(`/api/requests/${id}/decline`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to decline request");
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "declined" } : r))
    );
  }, []);

  return { requests, loading, error, refresh, approveRequest, declineRequest };
}
