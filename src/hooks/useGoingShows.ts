import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { LiveEventSummary } from "@/types";

type GoingResponse = { events: LiveEventSummary[] };

async function fetchGoingShows({
  signal,
}: FetchContext): Promise<GoingResponse> {
  const res = await fetch("/api/live/going", { signal });
  if (!res.ok) throw new Error("Failed to fetch going shows");
  return res.json();
}

/** Upcoming shows the user said they are going to, soonest first. */
export default function useGoingShows() {
  const { data, loading, error } = useAsyncData<GoingResponse>(
    "live-going",
    fetchGoingShows
  );
  return { events: data?.events ?? [], loading, error };
}
