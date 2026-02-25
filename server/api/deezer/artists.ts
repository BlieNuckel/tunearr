import NodeCache from "node-cache";
import { withCache } from "../../cache";
import { resilientFetch } from "../resilientFetch";
import { createLogger } from "../../logger";
import type { DeezerArtistSearchResponse } from "./types";

const log = createLogger("Deezer API");

const DEEZER_SEARCH_BASE = "https://api.deezer.com/search/artist";
const ONE_DAY_SECONDS = 24 * 60 * 60;

const deezerCache = new NodeCache({ stdTTL: 7 * ONE_DAY_SECONDS });

/**
 * Search for an artist on Deezer and return their image URL
 * @returns picture_xl (1000x1000) or empty string if not found
 */
const fetchArtistImage = async (artistName: string): Promise<string> => {
  try {
    const params = new URLSearchParams({
      q: artistName,
      limit: "1",
    });

    const url = `${DEEZER_SEARCH_BASE}?${params.toString()}`;
    const response = await resilientFetch(url);

    if (!response.ok) {
      log.error(`Failed to fetch image for ${artistName}: ${response.status}`);
      return "";
    }

    const data: DeezerArtistSearchResponse = await response.json();

    if (data.data?.length > 0 && data.data[0].picture_xl) {
      log.info(`Found image for ${artistName}`);
      return data.data[0].picture_xl;
    }

    log.info(`No image found for ${artistName}`);
    return "";
  } catch (error) {
    log.error(`Error fetching image for ${artistName}`, error);
    return "";
  }
};

export const getArtistImage = withCache(fetchArtistImage, {
  cache: deezerCache,
  key: (name) => name.toLowerCase(),
  ttlMs: 7 * ONE_DAY_SECONDS * 1000,
  label: "Deezer API",
});

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
