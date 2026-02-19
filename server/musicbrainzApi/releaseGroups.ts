import { MB_BASE, MB_HEADERS } from "./config";
import type {
  MusicBrainzSearchResponse,
  MusicBrainzArtistSearchResponse,
  ReleaseGroupSearchResult,
} from "./types";

/** Search for release groups (albums/EPs) by text query */
export async function searchReleaseGroups(
  query: string
): Promise<ReleaseGroupSearchResult> {
  const url = `${MB_BASE}/release-group/?query=${encodeURIComponent(query)}&limit=20&fmt=json`;
  const response = await fetch(url, { headers: MB_HEADERS });

  if (!response.ok) {
    throw new Error(`MusicBrainz returned ${response.status}`);
  }

  const data: MusicBrainzSearchResponse = await response.json();
  const sorted = data["release-groups"].sort((a, b) => b.score - a.score);

  return {
    ...data,
    "release-groups": sorted,
    count: sorted.length,
  };
}

/** Look up an artist by name and return all their albums and EPs */
export async function searchArtistReleaseGroups(
  artistName: string
): Promise<ReleaseGroupSearchResult> {
  const artistUrl = `${MB_BASE}/artist/?query=${encodeURIComponent(artistName)}&limit=1&fmt=json`;
  const artistResponse = await fetch(artistUrl, { headers: MB_HEADERS });

  if (!artistResponse.ok) {
    throw new Error(`MusicBrainz returned ${artistResponse.status}`);
  }

  const artistData: MusicBrainzArtistSearchResponse =
    await artistResponse.json();

  if (!artistData.artists || artistData.artists.length === 0) {
    return { "release-groups": [], count: 0, offset: 0 };
  }

  const artistId = artistData.artists[0].id;
  const url = `${MB_BASE}/release-group?artist=${artistId}&type=album|ep&limit=50&inc=artist-credits&fmt=json`;
  const response = await fetch(url, { headers: MB_HEADERS });

  if (!response.ok) {
    throw new Error(`MusicBrainz returned ${response.status}`);
  }

  const data: MusicBrainzSearchResponse = await response.json();
  const sorted = data["release-groups"].sort((a, b) => b.score - a.score);

  return {
    ...data,
    "release-groups": sorted,
    count: sorted.length,
  };
}
