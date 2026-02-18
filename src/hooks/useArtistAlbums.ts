import { useState, useCallback } from "react";
import { ReleaseGroup } from "../types";

export default function useArtistAlbums() {
  const [albums, setAlbums] = useState<ReleaseGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbums = useCallback(async (artistName: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: artistName,
        searchType: "artist",
      });
      const res = await fetch(`/api/musicbrainz/search?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch albums");
      }

      const data = await res.json();
      setAlbums(data["release-groups"] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch albums");
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { albums, loading, error, fetchAlbums };
}
