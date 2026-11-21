import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { LiveToursData } from "@/types";

async function fetchLiveTours({
  signal,
}: FetchContext): Promise<LiveToursData> {
  const res = await fetch("/api/live/tours", { signal });
  if (!res.ok) throw new Error("Failed to fetch live tours");
  return res.json();
}

/** One row per touring followed artist, nearest first. */
export default function useLiveTours() {
  const { data, loading, error } = useAsyncData<LiveToursData>(
    "live-tours",
    fetchLiveTours
  );
  return {
    tours: data?.tours ?? [],
    hasLocation: data?.hasLocation ?? true,
    loading,
    error,
  };
}
