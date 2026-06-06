import { resilientFetch } from "../resilientFetch";
import { MB_BASE, MB_HEADERS, rateLimitedMbFetch } from "./config";
import type {
  MusicBrainzReleaseGroup,
  MusicBrainzSearchResponse,
  ReleaseGroupSearchResult,
  MusicBrainzRelease,
  ReleaseGroupInfo,
  MusicBrainzLabelReleasesResponse,
} from "./types";

/** Search for release groups (albums/EPs) by text query */
export async function searchReleaseGroups(
  query: string
): Promise<ReleaseGroupSearchResult> {
  const url = `${MB_BASE}/release-group/?query=${encodeURIComponent(query)}&limit=100&fmt=json`;
  const response = await resilientFetch(url, { headers: MB_HEADERS });

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

/** Fetch all release groups (albums/EPs/singles) for a single artist MBID */
export async function fetchReleaseGroupsForArtist(
  artistId: string
): Promise<MusicBrainzReleaseGroup[]> {
  const url = `${MB_BASE}/release-group?artist=${artistId}&type=album|ep|single&limit=100&inc=artist-credits&fmt=json`;
  const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });
  if (!response.ok) return [];
  const data: MusicBrainzSearchResponse = await response.json();
  return data["release-groups"];
}

/** Look up a release group by its MBID, returning title and artist credit */
export async function getReleaseGroupById(
  releaseGroupMbid: string
): Promise<{ artistName: string; albumTitle: string } | null> {
  const url = `${MB_BASE}/release-group/${releaseGroupMbid}?inc=artist-credits&fmt=json`;
  const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });

  if (!response.ok) {
    return null;
  }

  const data: MusicBrainzReleaseGroup = await response.json();
  return {
    artistName: data["artist-credit"]?.[0]?.name ?? "Unknown Artist",
    albumTitle: data.title ?? "Unknown Album",
  };
}

type LabelResult = { name: string; mbid: string } | null;

/** Fetch the primary label for a release group */
export async function getReleaseGroupLabel(
  releaseGroupMbid: string
): Promise<LabelResult> {
  const url = `${MB_BASE}/release?release-group=${releaseGroupMbid}&inc=labels&limit=1&fmt=json`;
  const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });

  if (!response.ok) {
    return null;
  }

  const data: MusicBrainzLabelReleasesResponse = await response.json();
  const labelInfo = data.releases?.[0]?.["label-info"];
  if (!labelInfo || labelInfo.length === 0) {
    return null;
  }

  const label = labelInfo[0].label;
  if (!label?.name || !label?.id) {
    return null;
  }

  return { name: label.name, mbid: label.id };
}

/** Fetch the first-release-date for a release group */
export async function getReleaseGroupDate(
  releaseGroupMbid: string
): Promise<string | null> {
  const url = `${MB_BASE}/release-group/${releaseGroupMbid}?fmt=json`;
  const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { "first-release-date"?: string };
  return data["first-release-date"] || null;
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
