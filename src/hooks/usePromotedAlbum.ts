import { useState, useEffect, useCallback } from "react";

export type TraceArtistTagContribution = {
  tagName: string;
  rawCount: number;
  weight: number;
};

export type TraceArtistEntry = {
  name: string;
  viewCount: number;
  picked: boolean;
  tagContributions: TraceArtistTagContribution[];
};

export type TraceWeightedTag = {
  name: string;
  weight: number;
  fromArtists: string[];
};

export type TraceAlbumPoolInfo = {
  page1Count: number;
  deepPage: number;
  deepPageCount: number;
  totalAfterDedup: number;
};

export type TraceSelectionReason =
  | "preferred_non_library"
  | "fallback_in_library";

export type RecommendationTrace = {
  plexArtists: TraceArtistEntry[];
  weightedTags: TraceWeightedTag[];
  chosenTag: { name: string; weight: number };
  albumPool: TraceAlbumPoolInfo;
  selectionReason: TraceSelectionReason;
};

export type PromotedAlbumData = {
  album: {
    name: string;
    mbid: string;
    artistName: string;
    artistMbid: string;
    coverUrl: string;
  };
  tag: string;
  inLibrary: boolean;
  trace: RecommendationTrace;
};

export default function usePromotedAlbum() {
  const [promotedAlbum, setPromotedAlbum] = useState<PromotedAlbumData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbum = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = refresh
        ? "/api/promoted-album?refresh=true"
        : "/api/promoted-album";
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Failed to fetch promoted album");
      }

      const data = await res.json();
      setPromotedAlbum(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch promoted album"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbum();
  }, [fetchAlbum]);

  const refresh = useCallback(() => fetchAlbum(true), [fetchAlbum]);

  return { promotedAlbum, loading, error, refresh };
}
