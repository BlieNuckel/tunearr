import { useState, useCallback } from "react";
import { ArtistSearchResult, ReleaseGroup } from "../types";

export default function useSearch() {
  const [albums, setAlbums] = useState<ReleaseGroup[]>([]);
  const [artists, setArtists] = useState<ArtistSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(
        `/api/musicbrainz/search/all?${params.toString()}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data = await res.json();

      setArtists(data.artists || []);
      setAlbums(data["release-groups"] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setAlbums([]);
      setArtists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { albums, artists, loading, error, search };
}
