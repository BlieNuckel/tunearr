import { useState, useEffect, useCallback } from "react";

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
};

export default function usePromotedAlbum() {
  const [promotedAlbum, setPromotedAlbum] =
    useState<PromotedAlbumData | null>(null);
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
