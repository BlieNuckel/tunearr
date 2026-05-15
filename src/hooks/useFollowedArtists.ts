import { useState, useEffect, useCallback } from "react";
import type { FollowedArtistItem } from "@/types";

type Subscriber = (state: SharedState) => void;
type SharedState = {
  items: FollowedArtistItem[];
  loading: boolean;
  error: string | null;
};

let sharedState: SharedState = { items: [], loading: true, error: null };
let inflight: Promise<void> | null = null;
let initialized = false;
const subscribers = new Set<Subscriber>();

function publish(next: Partial<SharedState>): void {
  sharedState = { ...sharedState, ...next };
  for (const subscriber of subscribers) {
    subscriber(sharedState);
  }
}

async function refreshShared(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/followed");
      if (!res.ok) throw new Error("Failed to load followed artists");
      const data: FollowedArtistItem[] = await res.json();
      publish({ items: data, loading: false, error: null });
    } catch (err) {
      publish({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to load followed artists",
      });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Test-only helper to reset module state between tests */
export function __resetFollowedArtistsForTests(): void {
  sharedState = { items: [], loading: true, error: null };
  inflight = null;
  initialized = false;
  subscribers.clear();
}

export default function useFollowedArtists() {
  const [state, setState] = useState<SharedState>(sharedState);

  useEffect(() => {
    subscribers.add(setState);
    if (!initialized) {
      initialized = true;
      void refreshShared();
    }
    return () => {
      subscribers.delete(setState);
    };
  }, []);

  const follow = useCallback(async (artistMbid: string, artistName: string) => {
    const res = await fetch("/api/followed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistMbid, artistName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to follow artist");
    }
    await refreshShared();
  }, []);

  const unfollow = useCallback(async (artistMbid: string) => {
    const res = await fetch(`/api/followed/${encodeURIComponent(artistMbid)}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to unfollow artist");
    }
    publish({
      items: sharedState.items.filter((item) => item.artistMbid !== artistMbid),
    });
  }, []);

  const isFollowing = useCallback(
    (artistMbid: string) =>
      state.items.some((item) => item.artistMbid === artistMbid),
    [state.items]
  );

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    isFollowing,
    follow,
    unfollow,
    refresh: refreshShared,
  };
}
