import type { DeezerArtistSearchResponse } from "./types";

const DEEZER_SEARCH_BASE = "https://api.deezer.com/search/artist";

/**
 * Search for an artist on Deezer and return their image URL
 * @returns picture_xl (1000x1000) or empty string if not found
 */
export const getArtistImage = async (artistName: string): Promise<string> => {
  try {
    const params = new URLSearchParams({
      q: artistName,
      limit: "1",
    });

    const url = `${DEEZER_SEARCH_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `[Deezer API] Failed to fetch image for ${artistName}: ${response.status}`
      );
      return "";
    }

    const data: DeezerArtistSearchResponse = await response.json();

    if (data.data.length > 0 && data.data[0].picture_xl) {
      console.log(`[Deezer API] Found image for ${artistName}`);
      return data.data[0].picture_xl;
    }

    console.log(`[Deezer API] No image found for ${artistName}`);
    return "";
  } catch (error) {
    console.error(
      `[Deezer API] Error fetching image for ${artistName}:`,
      error
    );
    return "";
  }
};

/**
 * Batch fetch image URLs for multiple artists
 * @returns Map of artist name (lowercase) to image URL
 */
export const getArtistsImages = async (
  artistNames: string[]
): Promise<Map<string, string>> => {
  const results = await Promise.all(
    artistNames.map(async (name) => {
      const imageUrl = await getArtistImage(name);
      return { name: name.toLowerCase(), imageUrl };
    })
  );

  return new Map(results.map((r) => [r.name, r.imageUrl]));
};
