import { isAllowedReleaseType } from "./typeFilter";
import {
  getRecentReleasesForUser,
  parseSecondaryTypes,
  type FollowedReleaseWithArtist,
} from "../followed/followedService";
import { enrichRequestsWithLidarr } from "../requests/lidarrEnrichment";
import { isPlaceholderArtist } from "../../utils/artistFilter";
import { TIER_FRESH, TIER_STANDING } from "./rank";
import type { Highlight, RankedHighlight, ReleaseHighlight } from "./types";

/** How long a release stays news after its release date. */
export const RELEASE_HIGHLIGHT_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

function isHighlightable(row: FollowedReleaseWithArtist): boolean {
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
function dedupeByReleaseGroup(
  rows: FollowedReleaseWithArtist[]
): FollowedReleaseWithArtist[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (row.release_group_mbid === null) return true;
    if (seen.has(row.release_group_mbid)) return false;
    seen.add(row.release_group_mbid);
    return true;
  });
}

function toRanked(
  row: FollowedReleaseWithArtist
): RankedHighlight<ReleaseHighlight> {
  const unseen = row.viewed_at === null;
  return {
    tier: unseen ? TIER_FRESH : TIER_STANDING,
    at: row.release_date as string,
    highlight: {
      kind: "release",
      key: `release:${row.id}`,
      followedReleaseId: row.id,
      releaseGroupMbid: row.release_group_mbid,
      title: row.album_title,
      artistName: row.artist_name,
      artistMbid: row.artist_mbid,
      releaseDate: row.release_date as string,
      releaseType: row.release_type,
      coverUrl: row.cover_url,
      lidarrStatus: null,
      unseen,
    },
  };
}

/** Releases by followed artists that came out in the last two weeks. */
export async function listReleaseHighlights(
  userId: number,
  now: number
): Promise<RankedHighlight<ReleaseHighlight>[]> {
  const rows = await getRecentReleasesForUser(userId, {
    from: new Date(now - RELEASE_HIGHLIGHT_DAYS * DAY_MS)
      .toISOString()
      .slice(0, 10),
    to: new Date(now).toISOString().slice(0, 10),
  });
  return dedupeByReleaseGroup(rows.filter(isHighlightable)).map(toRanked);
}

/**
 * Adds Lidarr's view of each release. Runs after ranking so Lidarr is only
 * asked about the handful of releases that made the cut.
 */
export async function withLidarrStatus(
  highlights: Highlight[]
): Promise<Highlight[]> {
  const mbids = highlights.flatMap((h) =>
    h.kind === "release" && h.releaseGroupMbid ? [h.releaseGroupMbid] : []
  );
  if (mbids.length === 0) return highlights;

  const details = await enrichRequestsWithLidarr(mbids);
  const statusByMbid = new Map(
    mbids.map((mbid, i) => [mbid, details[i]?.status ?? null])
  );

  return highlights.map((h) =>
    h.kind === "release" && h.releaseGroupMbid
      ? { ...h, lidarrStatus: statusByMbid.get(h.releaseGroupMbid) ?? null }
      : h
  );
}
