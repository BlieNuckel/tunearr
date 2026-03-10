import { useState, useEffect, useMemo } from "react";

type LibraryAlbum = {
  id: number;
  title: string;
  foreignAlbumId: string;
  monitored: boolean;
};

export default function useLibraryAlbums() {
  const [libraryAlbums, setLibraryAlbums] = useState<LibraryAlbum[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/lidarr/albums");
        if (res.ok) {
          setLibraryAlbums(await res.json());
        }
      } catch {
        // Library may not be configured yet
      }
    };
    load();
  }, []);

  const libraryAlbumMbids = useMemo(
    () => new Set(libraryAlbums.map((a) => a.foreignAlbumId)),
    [libraryAlbums]
  );

  const isAlbumInLibrary = (albumMbid: string) =>
    libraryAlbumMbids.has(albumMbid);

  return { isAlbumInLibrary };
}
