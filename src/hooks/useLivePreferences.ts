import { useCallback } from "react";
import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { LiveLocation, LivePreferencesData } from "@/types";

async function fetchLivePreferences({
  signal,
}: FetchContext): Promise<LivePreferencesData> {
  const res = await fetch("/api/live/preferences", { signal });
  if (!res.ok) throw new Error("Failed to load live preferences");
  return res.json();
}

export default function useLivePreferences() {
  const { data, loading, error, refresh } = useAsyncData<LivePreferencesData>(
    "live-preferences",
    fetchLivePreferences
  );

  /** Resolves to an error message, or null once saved. Null clears the location. */
  const saveLocation = useCallback(
    async (location: LiveLocation | null): Promise<string | null> => {
      const res = await fetch("/api/live/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return (body as { error?: string }).error ?? "Could not save";
      }

      await refresh();
      return null;
    },
    [refresh]
  );

  return {
    location: data?.location ?? null,
    loaded: data !== null && data !== undefined,
    loading,
    error,
    saveLocation,
  };
}
