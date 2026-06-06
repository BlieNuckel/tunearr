import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ArtistTarget {
  mbid?: string;
  name: string;
}

/**
 * Navigate to an artist page. When the caller only has a name (e.g. a Last.fm
 * recommendation with no MBID), the name is first resolved to an MBID.
 */
export default function useNavigateToArtist() {
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(false);

  const go = useCallback(
    async ({ mbid, name }: ArtistTarget) => {
      if (mbid) {
        navigate(`/artist/${mbid}`);
        return;
      }
      if (resolving) return;

      setResolving(true);
      try {
        const res = await fetch(
          `/api/musicbrainz/artist/id?name=${encodeURIComponent(name)}`
        );
        if (!res.ok) return;
        const data: { mbid: string | null } = await res.json();
        if (data.mbid) navigate(`/artist/${data.mbid}`);
      } finally {
        setResolving(false);
      }
    },
    [navigate, resolving]
  );

  return { go, resolving };
}
