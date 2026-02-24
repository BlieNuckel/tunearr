import { MB_BASE, MB_HEADERS, rateLimitedMbFetch } from "./config";
import type {
  MusicBrainzSearchResponse,
  MusicBrainzArtistSearchResponse,
  ReleaseGroupSearchResult,
  MusicBrainzRelease,
  ReleaseGroupInfo,
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

  // Sort by release date (newest first), then by score
  const sorted = data["release-groups"].sort((a, b) => {
    const dateA = a["first-release-date"] || "";
    const dateB = b["first-release-date"] || "";

    if (dateA && dateB) {
      return dateB.localeCompare(dateA);
    }

    if (dateA) return -1;
    if (dateB) return 1;

    return b.score - a.score;
  });

  return {
    ...data,
    "release-groups": sorted,
    count: sorted.length,
  };
}

/** Convert a release MBID to its release-group ID and first release date */
export async function getReleaseGroupIdFromRelease(
  releaseMbid: string
): Promise<ReleaseGroupInfo | null> {
  const url = `${MB_BASE}/release/${releaseMbid}?inc=release-groups&fmt=json`;
  const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });

  if (!response.ok) {
    return null;
  }

  const data: MusicBrainzRelease = await response.json();
  const rg = data["release-group"];
  if (!rg?.id) return null;

  return {
    id: rg.id,
    firstReleaseDate: rg["first-release-date"] ?? "",
  };
}
