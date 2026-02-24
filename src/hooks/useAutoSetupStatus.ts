import { useState, useEffect, useCallback } from "react";
import { useLidarrContext } from "@/context/useLidarrContext";

type AutoSetupStatus = {
  indexerExists: boolean;
  downloadClientExists: boolean;
};

export default function useAutoSetupStatus() {
  const { isConnected } = useLidarrContext();
  const [status, setStatus] = useState<AutoSetupStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lidarr/auto-setup/status");
      if (!res.ok) {
        setStatus(null);
        return;
      }
      setStatus(await res.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchStatus();
    } else {
      setStatus(null);
    }
  }, [isConnected, fetchStatus]);

  return { status, loading, refetch: fetchStatus };
}
