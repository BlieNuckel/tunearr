import { ApiCache, withCache } from "../cache";
import type { DeezerTrackSearchResponse } from "./types";

const DEEZER_SEARCH_BASE = "https://api.deezer.com/search/track";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const deezerTrackCache = new ApiCache();

/** @returns 30-second MP3 preview URL, or empty string if not found */
const fetchTrackPreview = async (
  artistName: string,
  trackTitle: string
): Promise<string> => {
  try {
    const params = new URLSearchParams({
      q: `${artistName} ${trackTitle}`,
      limit: "1",
    });

    const url = `${DEEZER_SEARCH_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `[Deezer API] Failed to fetch preview for "${trackTitle}": ${response.status}`
      );
      return "";
    }

    const data: DeezerTrackSearchResponse = await response.json();

    if (data.data.length > 0 && data.data[0].preview) {
      return data.data[0].preview;
    }

    return "";
  } catch (error) {
    console.error(
      `[Deezer API] Error fetching preview for "${trackTitle}":`,
      error
    );
    return "";
  }
};

export const getTrackPreview = withCache(fetchTrackPreview, {
  cache: deezerTrackCache,
  key: (artist, title) => `${artist.toLowerCase()}|${title.toLowerCase()}`,
  ttlMs: 7 * ONE_DAY_MS,
  label: "Deezer API",
});

/**
 * Batch fetch preview URLs for multiple tracks
 * @returns Map of "artist|title" (lowercase) to preview URL
 */
export const getTrackPreviews = async (
  tracks: Array<{ artistName: string; title: string }>
): Promise<Map<string, string>> => {
  const results = await Promise.all(
    tracks.map(async ({ artistName, title }) => {
      const previewUrl = await getTrackPreview(artistName, title);
      return {
        key: `${artistName.toLowerCase()}|${title.toLowerCase()}`,
        previewUrl,
      };
    })
  );

  return new Map(results.map((r) => [r.key, r.previewUrl]));
};
