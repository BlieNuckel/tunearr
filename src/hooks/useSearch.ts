import { useState, useCallback } from "react";
import { ReleaseGroup } from "../types";

export default function useSearch() {
  const [results, setResults] = useState<ReleaseGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, searchType: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: query,
        searchType,
      });

      const res = await fetch(`/api/musicbrainz/search?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data = await res.json();
      setResults(data["release-groups"] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
