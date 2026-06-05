import { resilientFetch } from "../resilientFetch";
import {
  LISTENBRAINZ_LABS_BASE,
  DEFAULT_SIMILAR_ARTISTS_ALGORITHM,
} from "./config";
import type { ListenBrainzSimilarArtist } from "./types";

/**
 * Fetch session-based similar artists for a MusicBrainz artist MBID, sorted by
 * descending similarity score. Returns an empty array on any failure — callers
 * treat this as a best-effort signal.
 */
export async function getSimilarArtists(
  artistMbid: string,
  algorithm: string = DEFAULT_SIMILAR_ARTISTS_ALGORITHM
): Promise<ListenBrainzSimilarArtist[]> {
  const url = `${LISTENBRAINZ_LABS_BASE}/similar-artists/json?artist_mbids=${encodeURIComponent(
    artistMbid
  )}&algorithm=${encodeURIComponent(algorithm)}`;

  try {
    const response = await resilientFetch(url);
    if (!response.ok) return [];

    const data = (await response.json()) as ListenBrainzSimilarArtist[];
    if (!Array.isArray(data)) return [];

    return data
      .filter((a) => a.artist_mbid && a.artist_mbid !== artistMbid && a.name)
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}
