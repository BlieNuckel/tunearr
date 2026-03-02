import NodeCache from "node-cache";
import { withCache } from "../../cache";
import { resilientFetch } from "../resilientFetch";
import { createLogger } from "../../logger";
import type { AppleSearchResponse } from "./types";

const log = createLogger("Apple API");

const ITUNES_SEARCH_BASE = "https://itunes.apple.com/search";
const ONE_DAY_SECONDS = 24 * 60 * 60;

const appleCache = new NodeCache({ stdTTL: 7 * ONE_DAY_SECONDS });

/**
 * Search for an artist on Apple Music and return their artwork URL
 * @returns artworkUrl (300x300) or empty string if not found
 */
const fetchArtistArtwork = async (artistName: string): Promise<string> => {
  try {
    // Search for albums by the artist instead of the artist entity
    // Artist entities don't have artwork, but albums do
    const params = new URLSearchParams({
      term: artistName,
      entity: "album",
      limit: "1",
    });

    const url = `${ITUNES_SEARCH_BASE}?${params.toString()}`;
    const response = await resilientFetch(url);

    if (!response.ok) {
      log.error(
        `Failed to fetch artwork for ${artistName}: ${response.status}`
      );
      return "";
    }

    const data: AppleSearchResponse = await response.json();

    if (data.resultCount > 0 && data.results[0].artworkUrl100) {
      // Apple returns 100x100 by default, but we can request larger sizes
      // by replacing the size in the URL
      const artworkUrl = data.results[0].artworkUrl100.replace(
        "100x100",
        "600x600"
      );
      log.info(`Found artwork for ${artistName}`);
      return artworkUrl;
    }

    log.info(`No artwork found for ${artistName}`);
    return "";
  } catch (error) {
    log.error(`Error fetching artwork for ${artistName}`, error);
    return "";
  }
};

/**
 * Search for an album on Apple Music and return artwork URL
 * @returns artworkUrl (600x600) or empty string if not found
 */
const fetchAlbumArtwork = async (
  albumName: string,
  artistName: string
): Promise<string> => {
  try {
    const params = new URLSearchParams({
      term: `${artistName} ${albumName}`,
      entity: "album",
      limit: "1",
    });

    const url = `${ITUNES_SEARCH_BASE}?${params.toString()}`;
    const response = await resilientFetch(url);

    if (!response.ok) {
      log.error(
        `Failed to fetch album artwork for ${albumName} by ${artistName}: ${response.status}`
      );
      return "";
    }

    const data: AppleSearchResponse = await response.json();

    if (data.resultCount > 0 && data.results[0].artworkUrl100) {
      const artworkUrl = data.results[0].artworkUrl100.replace(
        "100x100",
        "600x600"
      );
      log.info(`Found album artwork for ${albumName}`);
      return artworkUrl;
    }

    log.info(`No album artwork found for ${albumName}`);
    return "";
  } catch (error) {
    log.error(`Error fetching album artwork for ${albumName}`, error);
    return "";
  }
};

export const getArtistArtwork = withCache(fetchArtistArtwork, {
  cache: appleCache,
  key: (name) => name.toLowerCase(),
  ttlMs: 7 * ONE_DAY_SECONDS * 1000,
  label: "Apple API",
});

export const getAlbumArtwork = withCache(fetchAlbumArtwork, {
  cache: appleCache,
  key: (albumName, artistName) =>
    `${albumName.toLowerCase()}|${artistName.toLowerCase()}`,
  ttlMs: 7 * ONE_DAY_SECONDS * 1000,
  label: "Apple API",
});

/**
 * Batch fetch artwork URLs for multiple artists
 * @returns Map of artist name (lowercase) to artwork URL
 */
export const getArtistsArtwork = async (
  artistNames: string[]
): Promise<Map<string, string>> => {
  const results = await Promise.all(
    artistNames.map(async (name) => {
      const artworkUrl = await getArtistArtwork(name);
      return { name: name.toLowerCase(), artworkUrl };
    })
  );

  return new Map(results.map((r) => [r.name, r.artworkUrl]));
};

/**
 * Batch fetch album artwork URLs
 * @returns Map of "albumName|artistName" (lowercase) to artwork URL
 */
export const getAlbumsArtwork = async (
  albums: Array<{ name: string; artistName: string }>
): Promise<Map<string, string>> => {
  const results = await Promise.all(
    albums.map(async ({ name, artistName }) => {
      const artworkUrl = await getAlbumArtwork(name, artistName);
      const key = `${name.toLowerCase()}|${artistName.toLowerCase()}`;
      return { key, artworkUrl };
    })
  );

  return new Map(results.map((r) => [r.key, r.artworkUrl]));
};
