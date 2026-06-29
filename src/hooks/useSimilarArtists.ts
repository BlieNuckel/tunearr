import { useState, useEffect } from "react";

export type SimilarArtist = {
  name: string;
  mbid: string;
  imageUrl: string;
  match?: number;
};

export default function useSimilarArtists(
  artistName: string | undefined,
  excludeMbid?: string
) {
  const [artists, setArtists] = useState<SimilarArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistName) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(
          `/api/lastfm/similar?artist=${encodeURIComponent(artistName)}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch similar artists");
        }
        const data: { artists: SimilarArtist[] } = await res.json();
        if (cancelled) return;
        const filtered = (data.artists || [])
          .filter((a) => !excludeMbid || a.mbid !== excludeMbid)
          .slice(0, 10);
        setArtists(filtered);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to fetch similar artists"
        );
        setArtists([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [artistName, excludeMbid]);

  return { artists, loading, error };
}
