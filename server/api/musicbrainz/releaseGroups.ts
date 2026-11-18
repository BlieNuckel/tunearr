import { mbJson } from "./config";
import { mbCached, mbPrime, MB_TTL } from "./cache";
import { getFirstRelease, type LabelResult } from "./firstRelease";
import type { MbPriority } from "./queue";
import type {
  MusicBrainzReleaseGroup,
  MusicBrainzSearchResponse,
  ReleaseGroupSearchResult,
  MusicBrainzRelease,
  ReleaseGroupInfo,
} from "./types";

export type AlbumDetails = {
  mbid: string;
  title: string;
  artistName: string;
  artistMbid: string | null;
  firstReleaseDate: string | null;
  primaryType: string | null;
  secondaryTypes: string[];
};

/**
 * Search results, an artist's discography and a direct lookup all carry these
 * fields in the same shape (search leaves out empty secondary types), so any
 * of them can fill an album's details.
 */
function toAlbumDetails(data: MusicBrainzReleaseGroup): AlbumDetails {
  const credit = data["artist-credit"]?.[0];

  return {
    mbid: data.id,
    title: data.title ?? "Unknown Album",
    artistName: credit?.name ?? "Unknown Artist",
    artistMbid: credit?.artist?.id ?? null,
    firstReleaseDate: data["first-release-date"] || null,
    primaryType: data["primary-type"] || null,
    secondaryTypes: data["secondary-types"] ?? [],
  };
}

function albumDetailsKey(releaseGroupMbid: string): string {
  return `album:${releaseGroupMbid}`;
}

/**
 * Seed album details for every listed release group, so opening one from a
 * search or an artist page needs no request for its header. Rows without a
 * credited artist MBID are skipped; the album page needs it.
 */
function primeAlbumDetails(releaseGroups: MusicBrainzReleaseGroup[]): void {
  for (const rg of releaseGroups) {
    if (!rg.id || !rg["artist-credit"]?.[0]?.artist?.id) continue;
    mbPrime(
      { key: albumDetailsKey(rg.id), ttlSeconds: MB_TTL.immutable },
      toAlbumDetails(rg)
    );
  }
}

async function loadReleaseGroupSearch(
  query: string,
  priority: MbPriority
): Promise<ReleaseGroupSearchResult> {
  const path = `/release-group/?query=${encodeURIComponent(query)}&limit=100&fmt=json`;
  const data = await mbJson<MusicBrainzSearchResponse>(path, priority);

  if (!data) {
    return { "release-groups": [], count: 0, offset: 0 };
  }

  const sorted = [...data["release-groups"]].sort((a, b) => b.score - a.score);
  primeAlbumDetails(sorted);

  return { ...data, "release-groups": sorted, count: sorted.length };
}

async function loadArtistReleaseGroups(
  artistId: string,
  priority: MbPriority
): Promise<MusicBrainzReleaseGroup[]> {
  const path = `/release-group?artist=${artistId}&type=album|ep|single&limit=100&inc=artist-credits&fmt=json`;
  const data = await mbJson<MusicBrainzSearchResponse>(path, priority);
  const releaseGroups = data?.["release-groups"] ?? [];
  primeAlbumDetails(releaseGroups);
  return releaseGroups;
}

async function loadAlbumDetails(
  releaseGroupMbid: string,
  priority: MbPriority
): Promise<AlbumDetails | null> {
  const path = `/release-group/${releaseGroupMbid}?inc=artist-credits&fmt=json`;
  const data = await mbJson<MusicBrainzReleaseGroup>(path, priority);
  if (!data) return null;
  return toAlbumDetails(data);
}

async function loadReleaseGroupIdFromRelease(
  releaseMbid: string,
  priority: MbPriority
): Promise<ReleaseGroupInfo | null> {
  const path = `/release/${releaseMbid}?inc=release-groups&fmt=json`;
  const data = await mbJson<MusicBrainzRelease>(path, priority);

  const rg = data?.["release-group"];
  if (!rg?.id) return null;

  return {
    id: rg.id,
    firstReleaseDate: rg["first-release-date"] ?? "",
    primaryType: rg["primary-type"] ?? null,
    secondaryTypes: rg["secondary-types"] ?? [],
  };
}

/** Search for release groups (albums/EPs) by text query */
export function searchReleaseGroups(
  query: string,
  priority: MbPriority = "interactive"
): Promise<ReleaseGroupSearchResult> {
  return mbCached(
    {
      key: `rg-search:${query.toLowerCase()}`,
      ttlSeconds: MB_TTL.volatile,
      priority,
    },
    (p) => loadReleaseGroupSearch(query, p)
  );
}

/** Fetch all release groups (albums/EPs/singles) for a single artist MBID */
export function fetchReleaseGroupsForArtist(
  artistId: string,
  priority: MbPriority = "interactive"
): Promise<MusicBrainzReleaseGroup[]> {
  return mbCached(
    {
      key: `artist-rgs:${artistId}`,
      ttlSeconds: MB_TTL.volatile,
      priority,
    },
    (p) => loadArtistReleaseGroups(artistId, p)
  );
}

/**
 * Title and artist credit for a release group. Read from album details, which
 * fetch the same document, so it costs no request of its own.
 */
export async function getReleaseGroupById(
  releaseGroupMbid: string,
  priority: MbPriority = "interactive"
): Promise<{ artistName: string; albumTitle: string } | null> {
  const album = await getAlbumDetails(releaseGroupMbid, priority);
  if (!album) return null;
  return { artistName: album.artistName, albumTitle: album.title };
}

/** Fetch album metadata for a release group, including artist MBID and type */
export function getAlbumDetails(
  releaseGroupMbid: string,
  priority: MbPriority = "interactive"
): Promise<AlbumDetails | null> {
  return mbCached(
    {
      key: albumDetailsKey(releaseGroupMbid),
      ttlSeconds: MB_TTL.immutable,
      priority,
    },
    (p) => loadAlbumDetails(releaseGroupMbid, p)
  );
}

/** Fetch the primary label for a release group, from its first release */
export async function getReleaseGroupLabel(
  releaseGroupMbid: string,
  priority: MbPriority = "interactive"
): Promise<LabelResult> {
  return (await getFirstRelease(releaseGroupMbid, priority)).label;
}

/** The first-release-date for a release group, read from its album details */
export async function getReleaseGroupDate(
  releaseGroupMbid: string,
  priority: MbPriority = "interactive"
): Promise<string | null> {
  const album = await getAlbumDetails(releaseGroupMbid, priority);
  return album?.firstReleaseDate ?? null;
}

/** Convert a release MBID to its release-group ID, first release date and types */
export function getReleaseGroupIdFromRelease(
  releaseMbid: string,
  priority: MbPriority = "interactive"
): Promise<ReleaseGroupInfo | null> {
  return mbCached(
    {
      key: `release-rg:${releaseMbid}`,
      ttlSeconds: MB_TTL.immutable,
      priority,
    },
    (p) => loadReleaseGroupIdFromRelease(releaseMbid, p)
  );
}
