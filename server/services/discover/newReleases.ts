import { isAllowedReleaseType } from "./typeFilter";
import {
  getFollowedReleasesForUser,
  parseSecondaryTypes,
  type FollowedReleaseWithArtist,
} from "../followed/followedService";
import { enrichRequestsWithLidarr } from "../requests/lidarrEnrichment";
import { isPlaceholderArtist } from "../../utils/artistFilter";

export type NewReleaseItem = {
  releaseGroupMbid: string | null;
  title: string;
  artistName: string;
  artistMbid: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  lidarrStatus: "downloading" | "wanted" | "imported" | null;
  followedReleaseId: number | null;
};

export type NewReleasesResult = {
  items: NewReleaseItem[];
  windowDays: number;
};

type Candidate = Omit<NewReleaseItem, "lidarrStatus"> & {
  unseen: boolean;
};

export const RELEASE_WINDOWS_DAYS = [30, 60, 90] as const;
/**
 * One full row of the Discover shelf. Cover art is square and therefore
 * width-driven, so the column count is what sizes a card to the tile: the
 * shelf spans the full grid, and six columns keep each card as tall as the
 * tile's three rows.
 */
export const TARGET_ITEM_COUNT = 6;

const FOLLOWED_FETCH_LIMIT = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

function followedToCandidate(row: FollowedReleaseWithArtist): Candidate {
  return {
    releaseGroupMbid: row.release_group_mbid,
    title: row.album_title,
    artistName: row.artist_name,
    artistMbid: row.artist_mbid,
    releaseDate: row.release_date,
    coverUrl: row.cover_url,
    followedReleaseId: row.id,
    unseen: row.viewed_at === null,
  };
}

function isFollowedRowAllowed(row: FollowedReleaseWithArtist): boolean {
  if (isPlaceholderArtist(row.artist_name, row.artist_mbid)) return false;
  return isAllowedReleaseType(
    row.release_type,
    parseSecondaryTypes(row.secondary_types)
  );
}

/**
 * A collaboration followed through two of its artists is stored once per
 * artist, so the same release group can arrive twice. The first one seen wins.
 */
function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (candidate.releaseGroupMbid === null) return true;
    if (seen.has(candidate.releaseGroupMbid)) return false;
    seen.add(candidate.releaseGroupMbid);
    return true;
  });
}

function withinWindow(
  candidate: Candidate,
  windowDays: number,
  now: number
): boolean {
  if (!candidate.releaseDate) return false;
  const released = Date.parse(candidate.releaseDate);
  if (Number.isNaN(released)) return false;
  return released <= now && now - released <= windowDays * DAY_MS;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  const aPriority = a.unseen ? 0 : 1;
  const bPriority = b.unseen ? 0 : 1;
  if (aPriority !== bPriority) return aPriority - bPriority;
  return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
}

async function enrichWithLidarrStatus(
  candidates: Candidate[]
): Promise<NewReleaseItem[]> {
  const mbids = candidates
    .map((c) => c.releaseGroupMbid)
    .filter((mbid): mbid is string => mbid !== null);
  const details = mbids.length > 0 ? await enrichRequestsWithLidarr(mbids) : [];

  const statusByMbid = new Map(
    mbids.map((mbid, i) => [mbid, details[i]?.status ?? null])
  );

  return candidates.map(({ unseen: _unseen, ...item }) => ({
    ...item,
    lidarrStatus: item.releaseGroupMbid
      ? (statusByMbid.get(item.releaseGroupMbid) ?? null)
      : null,
  }));
}

/**
 * The new-releases shelf: releases by artists the user follows, recorded by
 * the followed-artist poller. The window widens 30 → 60 → 90 days until the
 * target count exists; unseen releases claim slots first, then newest wins.
 */
export async function getNewReleases(
  userId: number,
  now: number = Date.now()
): Promise<NewReleasesResult> {
  const followedRows = await getFollowedReleasesForUser(
    userId,
    FOLLOWED_FETCH_LIMIT
  );
  const candidates = dedupeCandidates(
    followedRows.filter(isFollowedRowAllowed).map(followedToCandidate)
  );

  let windowDays: number =
    RELEASE_WINDOWS_DAYS[RELEASE_WINDOWS_DAYS.length - 1];
  let pool: Candidate[] = [];
  for (const window of RELEASE_WINDOWS_DAYS) {
    pool = candidates.filter((c) => withinWindow(c, window, now));
    if (pool.length >= TARGET_ITEM_COUNT) {
      windowDays = window;
      break;
    }
  }

  const selected = pool.sort(compareCandidates).slice(0, TARGET_ITEM_COUNT);
  const items = await enrichWithLidarrStatus(selected);

  return { items, windowDays };
}
