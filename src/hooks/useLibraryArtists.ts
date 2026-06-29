import { useState, useEffect, useMemo } from "react";

type LibraryArtist = {
  id: number;
  name: string;
  foreignArtistId: string;
};

export default function useLibraryArtists() {
  const [libraryArtists, setLibraryArtists] = useState<LibraryArtist[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/lidarr/artists");
        if (res.ok) {
          setLibraryArtists(await res.json());
        }
      } catch {
        // Library may not be configured yet
      }
    };
    load();
  }, []);

  const libraryMbids = useMemo(
    () => new Set(libraryArtists.map((a) => a.foreignArtistId)),
    [libraryArtists]
  );

  const libraryNames = useMemo(
    () => new Set(libraryArtists.map((a) => a.name.toLowerCase())),
    [libraryArtists]
  );

  const isArtistInLibrary = (mbid: string, name: string) =>
    (mbid !== "" && libraryMbids.has(mbid)) ||
    libraryNames.has(name.toLowerCase());

  return { isArtistInLibrary };
}
