import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/context/useSettings";

type AutoSetupStatus = {
  indexerExists: boolean;
  downloadClientExists: boolean;
};

export default function useAutoSetupStatus() {
  const { isConnected } = useSettings();
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
