import { useState, useEffect } from "react";
import type { AlbumDetails, ReleaseGroup } from "../types";

interface AlbumDetailsResponse {
  album: AlbumDetails;
  moreFromArtist: ReleaseGroup[];
}

export default function useReleaseGroupDetails(mbid: string | undefined) {
  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [moreFromArtist, setMoreFromArtist] = useState<ReleaseGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mbid) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/musicbrainz/album/${mbid}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load album");
        }
        const data: AlbumDetailsResponse = await res.json();
        if (cancelled) return;
        setAlbum(data.album);
        setMoreFromArtist(data.moreFromArtist || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load album");
        setAlbum(null);
        setMoreFromArtist([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [mbid]);

  return { album, moreFromArtist, loading, error };
}
