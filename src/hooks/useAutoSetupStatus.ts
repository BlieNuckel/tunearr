import useAsyncData from "./useAsyncData";
import { useSettings } from "@/context/useSettings";

type AutoSetupStatus = {
  indexerExists: boolean;
  downloadClientExists: boolean;
};

async function fetchAutoSetupStatus(): Promise<AutoSetupStatus | null> {
  try {
    const res = await fetch("/api/lidarr/auto-setup/status");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function useAutoSetupStatus() {
  const { isConnected } = useSettings();
  const { data, loading, refresh } = useAsyncData(
    isConnected ? "auto-setup-status" : null,
    fetchAutoSetupStatus
  );

  return { status: data ?? null, loading, refetch: refresh };
}
