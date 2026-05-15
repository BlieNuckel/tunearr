import { resilientFetch } from "../resilientFetch";
import { createLogger } from "../../logger";
import type {
  DeezerArtistSearchResponse,
  DeezerAlbum,
  DeezerAlbumsResponse,
} from "./types";

const log = createLogger("Deezer Albums");

const DEEZER_BASE = "https://api.deezer.com";

async function findDeezerArtistId(artistName: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({ q: artistName, limit: "1" });
    const response = await resilientFetch(
      `${DEEZER_BASE}/search/artist?${params.toString()}`
    );
    if (!response.ok) return null;
    const data: DeezerArtistSearchResponse = await response.json();
    if (data.data?.length > 0) {
      return data.data[0].id;
    }
    return null;
  } catch (error) {
    log.error(`Error looking up Deezer artist for ${artistName}`, error);
    return null;
  }
}

/**
 * Fetch the most recent albums for an artist on Deezer.
 * Resolves the Deezer artist id by name (best-effort).
 */
export async function getArtistAlbumsByName(
  artistName: string,
  limit = 25
): Promise<DeezerAlbum[]> {
  const artistId = await findDeezerArtistId(artistName);
  if (artistId === null) return [];

  try {
    const url = `${DEEZER_BASE}/artist/${artistId}/albums?limit=${limit}`;
    const response = await resilientFetch(url);
    if (!response.ok) {
      log.error(
        `Failed to fetch albums for Deezer artist ${artistId}: ${response.status}`
      );
      return [];
    }
    const data: DeezerAlbumsResponse = await response.json();
    return data.data ?? [];
  } catch (error) {
    log.error(`Error fetching Deezer albums for ${artistName}`, error);
    return [];
  }
}
