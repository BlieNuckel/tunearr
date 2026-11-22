import { useCallback, useEffect, useRef } from "react";
import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { LiveEventSummary, LiveTrackingState } from "@/types";

type ArtistLiveDatesResponse = {
  events: LiveEventSummary[];
  /** null when nobody follows this artist, so nothing is being watched at all. */
  liveTracking: LiveTrackingState | null;
};

export type ArtistLiveDatesState = {
  dates: LiveEventSummary[];
  /** null when nobody follows this artist, so nothing is being watched at all. */
  tracking: LiveTrackingState | null;
  loading: boolean;
  error: string | null;
  /** Refetches once, after the background lookup a follow starts has had time to finish. */
  refreshSoon: () => void;
};

/** A new follow is looked up in the background, and its dates land within seconds. */
export const REFRESH_SOON_DELAY_MS = 5000;

async function fetchArtistLiveDates({
  key,
  signal,
}: FetchContext): Promise<ArtistLiveDatesResponse> {
  const mbid = key.replace("artist-live-dates:", "");
  const res = await fetch(`/api/live/artist/${mbid}`, { signal });
  if (!res.ok) throw new Error("Failed to fetch live dates");
  return res.json();
}

export default function useArtistLiveDates(
  mbid: string | undefined
): ArtistLiveDatesState {
  const { data, loading, error, refresh } =
    useAsyncData<ArtistLiveDatesResponse>(
      mbid ? `artist-live-dates:${mbid}` : null,
      fetchArtistLiveDates
    );
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), [mbid]);

  const refreshSoon = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refresh(), REFRESH_SOON_DELAY_MS);
  }, [refresh]);

  return {
    dates: data?.events ?? [],
    tracking: data?.liveTracking ?? null,
    loading,
    error,
    refreshSoon,
  };
}
