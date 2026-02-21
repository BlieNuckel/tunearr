import { useState, useEffect } from "react";

export type LibraryArtist = {
  id: number;
  name: string;
  foreignArtistId: string;
};

export type LibraryAlbum = {
  id: number;
  title: string;
  foreignAlbumId: string;
  monitored: boolean;
};

export default function useLibraryData() {
  const [libraryArtists, setLibraryArtists] = useState<LibraryArtist[]>([]);
  const [libraryAlbums, setLibraryAlbums] = useState<LibraryAlbum[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const [artistsRes, albumsRes] = await Promise.all([
          fetch("/api/lidarr/artists"),
          fetch("/api/lidarr/albums"),
        ]);

        if (artistsRes.ok) {
          const data = await artistsRes.json();
          setLibraryArtists(data);
        }

        if (albumsRes.ok) {
          const data = await albumsRes.json();
          setLibraryAlbums(data);
        }
      } catch {
        // Library may not be configured yet
      } finally {
        setLibraryLoading(false);
      }
    };
    loadLibrary();
  }, []);

  return { libraryArtists, libraryAlbums, libraryLoading };
}
