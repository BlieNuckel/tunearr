import { useState, useEffect } from "react";

export type PlexTopArtist = {
  name: string;
  viewCount: number;
  thumb: string;
  genres: string[];
};

export default function usePlexTopArtists() {
  const [plexTopArtists, setPlexTopArtists] = useState<PlexTopArtist[]>([]);
  const [plexLoading, setPlexLoading] = useState(true);

  useEffect(() => {
    const loadPlexTop = async () => {
      try {
        const res = await fetch("/api/plex/top-artists?limit=10");
        if (res.ok) {
          const data = await res.json();
          setPlexTopArtists(data.artists || []);
        }
      } catch {
        // Plex may not be configured
      } finally {
        setPlexLoading(false);
      }
    };
    loadPlexTop();
  }, []);

  return { plexTopArtists, plexLoading };
}
