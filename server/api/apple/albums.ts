import { resilientFetch } from "../resilientFetch";
import { createLogger } from "../../logger";
import type { AppleAlbum, AppleSearchResponse } from "./types";

const log = createLogger("Apple Albums");

const ITUNES_SEARCH = "https://itunes.apple.com/search";
const ITUNES_LOOKUP = "https://itunes.apple.com/lookup";

async function findAppleArtistId(artistName: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      term: artistName,
      entity: "musicArtist",
      limit: "1",
    });
    const response = await resilientFetch(
      `${ITUNES_SEARCH}?${params.toString()}`
    );
    if (!response.ok) return null;
    const data: AppleSearchResponse = await response.json();
    if (data.resultCount > 0 && data.results[0].artistId) {
      return data.results[0].artistId;
    }
    return null;
  } catch (error) {
    log.error(`Error looking up Apple artist for ${artistName}`, error);
    return null;
  }
}

/**
 * Fetch albums for an Apple Music artist by name (best-effort lookup).
 * Filters out the artist row that the lookup endpoint also returns.
 */
export async function getArtistAlbumsByName(
  artistName: string,
  limit = 25
): Promise<AppleAlbum[]> {
  const artistId = await findAppleArtistId(artistName);
  if (artistId === null) return [];

  try {
    const params = new URLSearchParams({
      id: String(artistId),
      entity: "album",
      limit: String(limit),
      sort: "recent",
    });
    const response = await resilientFetch(
      `${ITUNES_LOOKUP}?${params.toString()}`
    );
    if (!response.ok) {
      log.error(
        `Failed to fetch albums for Apple artist ${artistId}: ${response.status}`
      );
      return [];
    }
    const data: AppleSearchResponse = await response.json();
    return data.results
      .filter((r) => r.wrapperType === "collection" && r.collectionId)
      .map((r) => ({
        collectionId: r.collectionId as number,
        collectionName: r.collectionName ?? "",
        releaseDate: r.releaseDate,
        collectionType: r.collectionType,
        artistName: r.artistName,
        artworkUrl100: r.artworkUrl100,
      }));
  } catch (error) {
    log.error(`Error fetching Apple albums for ${artistName}`, error);
    return [];
  }
}
