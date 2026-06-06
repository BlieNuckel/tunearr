import { useState, useCallback } from "react";
import { ArtistSearchResult, ReleaseGroup } from "../types";

type SearchKind = "album" | "artist";

export default function useSearch() {
  const [albums, setAlbums] = useState<ReleaseGroup[]>([]);
  const [artists, setArtists] = useState<ArtistSearchResult[]>([]);
  const [kind, setKind] = useState<SearchKind>("album");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, searchType: string) => {
    if (!query.trim()) return;

    const isArtist = searchType === "artist";
    setLoading(true);
    setError(null);
    setKind(isArtist ? "artist" : "album");

    try {
      const params = new URLSearchParams({ q: query });
      const path = isArtist
        ? `/api/musicbrainz/artist/search?${params.toString()}`
        : `/api/musicbrainz/search?${params.toString()}`;

      const res = await fetch(path);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data = await res.json();

      if (isArtist) {
        setArtists(data.artists || []);
        setAlbums([]);
      } else {
        setAlbums(data["release-groups"] || []);
        setArtists([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setAlbums([]);
      setArtists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { albums, artists, kind, loading, error, search };
}
