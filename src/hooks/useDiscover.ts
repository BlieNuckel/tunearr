import { useState, useEffect, useCallback, useRef } from "react";

/** @typedef {Object} LibraryArtist */
export type LibraryArtist = {
  id: number;
  name: string;
  foreignArtistId: string;
};

/** @typedef {Object} LibraryAlbum */
export type LibraryAlbum = {
  id: number;
  title: string;
  foreignAlbumId: string;
  monitored: boolean;
};

/** @typedef {Object} SimilarArtist */
export type SimilarArtist = {
  name: string;
  mbid: string;
  match: number;
  imageUrl: string;
};

/** @typedef {Object} ArtistTag */
export type ArtistTag = {
  name: string;
  count: number;
};

/** @typedef {Object} TagArtist */
export type TagArtist = {
  name: string;
  mbid: string;
  imageUrl: string;
  rank: number;
};

/** @typedef {Object} PlexTopArtist */
export type PlexTopArtist = {
  name: string;
  viewCount: number;
  thumb: string;
  genres: string[];
};

export default function useDiscover() {
  const [libraryArtists, setLibraryArtists] = useState<LibraryArtist[]>([]);
  const [libraryAlbums, setLibraryAlbums] = useState<LibraryAlbum[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const [plexTopArtists, setPlexTopArtists] = useState<PlexTopArtist[]>([]);
  const [plexLoading, setPlexLoading] = useState(true);

  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);

  const [artistTags, setArtistTags] = useState<ArtistTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  const [tagArtists, setTagArtists] = useState<TagArtist[]>([]);
  const [tagArtistsLoading, setTagArtistsLoading] = useState(false);
  const [tagArtistsError, setTagArtistsError] = useState<string | null>(null);
  const [tagPagination, setTagPagination] = useState({
    page: 1,
    totalPages: 1,
  });

  const [autoSelectedArtist, setAutoSelectedArtist] = useState<string | null>(
    null
  );

  const hasAutoTriggered = useRef(false);

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

  const fetchSimilar = useCallback(async (artistName: string) => {
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarArtists([]);
    setArtistTags([]);

    try {
      const [similarRes, tagsRes] = await Promise.all([
        fetch(`/api/lastfm/similar?artist=${encodeURIComponent(artistName)}`),
        fetch(
          `/api/lastfm/artist/tags?artist=${encodeURIComponent(artistName)}`
        ),
      ]);

      if (!similarRes.ok) {
        const data = await similarRes.json();
        throw new Error(data.error || "Failed to fetch similar artists");
      }

      const similarData = await similarRes.json();
      setSimilarArtists(similarData.artists);

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setArtistTags(tagsData.tags.slice(0, 10));
      }
    } catch (err) {
      setSimilarError(
        err instanceof Error ? err.message : "Failed to fetch similar artists"
      );
    } finally {
      setSimilarLoading(false);
      setTagsLoading(false);
    }
  }, []);

  // Auto-discover: when Plex top artists load, pick the top one and fetch similar
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    if (plexLoading) return;
    if (plexTopArtists.length === 0) return;

    hasAutoTriggered.current = true;
    const topArtist = plexTopArtists[0].name;
    setAutoSelectedArtist(topArtist);
    fetchSimilar(topArtist);
  }, [plexLoading, plexTopArtists, fetchSimilar]);

  const fetchTagArtists = useCallback(async (tag: string, page = 1) => {
    setTagArtistsLoading(true);
    setTagArtistsError(null);
    if (page === 1) setTagArtists([]);

    try {
      const res = await fetch(
        `/api/lastfm/tag/artists?tag=${encodeURIComponent(tag)}&page=${page}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch tag artists");
      }

      const data = await res.json();
      setTagArtists(data.artists);
      setTagPagination(data.pagination);
    } catch (err) {
      setTagArtistsError(
        err instanceof Error ? err.message : "Failed to fetch tag artists"
      );
    } finally {
      setTagArtistsLoading(false);
    }
  }, []);

  return {
    libraryArtists,
    libraryAlbums,
    libraryLoading,
    plexTopArtists,
    plexLoading,
    autoSelectedArtist,
    similarArtists,
    similarLoading,
    similarError,
    artistTags,
    tagsLoading,
    tagArtists,
    tagArtistsLoading,
    tagArtistsError,
    tagPagination,
    fetchSimilar,
    fetchTagArtists,
  };
}
