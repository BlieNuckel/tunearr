import { useState, useEffect, useCallback } from "react";

export type PromotedArtist = {
  name: string;
  mbid: string;
  imageUrl: string;
  match?: number;
  inLibrary: boolean;
};

export type PromotedArtistsData = {
  artists: PromotedArtist[];
  seedArtists: string[];
};

export default function usePromotedArtists() {
  const [promotedArtists, setPromotedArtists] =
    useState<PromotedArtistsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtists = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = refresh
        ? "/api/promoted-artists?refresh=true"
        : "/api/promoted-artists";
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Failed to fetch promoted artists");
      }

      const data = await res.json();
      setPromotedArtists(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch promoted artists"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const refresh = useCallback(() => fetchArtists(true), [fetchArtists]);

  return { promotedArtists, loading, error, refresh };
}
