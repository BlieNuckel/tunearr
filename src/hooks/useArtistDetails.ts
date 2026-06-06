import { useState, useEffect } from "react";
import type { ArtistDetails, ReleaseGroup } from "../types";

interface ArtistDetailsResponse {
  artist: ArtistDetails;
  releaseGroups: ReleaseGroup[];
}

export default function useArtistDetails(mbid: string | undefined) {
  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [releaseGroups, setReleaseGroups] = useState<ReleaseGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mbid) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/musicbrainz/artist/${mbid}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load artist");
        }
        const data: ArtistDetailsResponse = await res.json();
        if (cancelled) return;
        setArtist(data.artist);
        setReleaseGroups(data.releaseGroups || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load artist");
        setArtist(null);
        setReleaseGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [mbid]);

  return { artist, releaseGroups, loading, error };
}
