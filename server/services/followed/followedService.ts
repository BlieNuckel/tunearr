import {
  getDataSource,
  FollowedArtist,
  SeenRelease,
  User,
  type ReleaseSource,
} from "../../db/index";
import { createLogger } from "../../logger";

type AddFollowResult =
  { status: "added"; id: number } | { status: "already_following"; id: number };

type RemoveFollowResult = { status: "removed" } | { status: "not_found" };

type RecordSeenInput = {
  followed_artist_id: number;
  release_key: string;
  source: ReleaseSource;
  album_title: string;
  release_date: string | null;
  external_id: string | null;
};

const log = createLogger("followed");

function getFollowedRepo() {
  return getDataSource().getRepository(FollowedArtist);
}

function getSeenRepo() {
  return getDataSource().getRepository(SeenRelease);
}

export async function followArtist(
  userId: number,
  artistMbid: string,
  artistName: string
): Promise<AddFollowResult> {
  const repo = getFollowedRepo();

  const existing = await repo.findOne({
    where: { user_id: userId, artist_mbid: artistMbid },
  });

  if (existing) {
    return { status: "already_following", id: existing.id };
  }

  const item = repo.create({
    user_id: userId,
    artist_mbid: artistMbid,
    artist_name: artistName,
    last_checked_at: null,
  });

  const saved = await repo.save(item);
  log.info(`User ${userId} followed "${artistName}" (${artistMbid})`);

  return { status: "added", id: saved.id };
}

export async function unfollowArtist(
  userId: number,
  artistMbid: string
): Promise<RemoveFollowResult> {
  const repo = getFollowedRepo();

  const item = await repo.findOne({
    where: { user_id: userId, artist_mbid: artistMbid },
  });

  if (!item) {
    return { status: "not_found" };
  }

  await repo.remove(item);
  log.info(`User ${userId} unfollowed "${item.artist_name}"`);

  return { status: "removed" };
}

export async function getFollowedArtists(
  userId: number
): Promise<FollowedArtist[]> {
  const repo = getFollowedRepo();

  return repo.find({
    where: { user_id: userId },
    order: { created_at: "DESC" },
  });
}

export async function getAllFollowedArtists(): Promise<FollowedArtist[]> {
  const repo = getFollowedRepo();
  return repo.find({ order: { created_at: "ASC" } });
}

export async function hasSeenRelease(
  followedArtistId: number,
  releaseKey: string
): Promise<boolean> {
  const repo = getSeenRepo();
  const existing = await repo.findOne({
    where: { followed_artist_id: followedArtistId, release_key: releaseKey },
  });
  return existing !== null;
}

export async function recordSeenRelease(
  input: RecordSeenInput
): Promise<SeenRelease> {
  const repo = getSeenRepo();
  const row = repo.create(input);
  return repo.save(row);
}

export async function getSeenReleasesForUser(
  userId: number,
  limit = 50
): Promise<(SeenRelease & { artist_name: string; artist_mbid: string })[]> {
  const ds = getDataSource();
  const rows = (await ds.query(
    `SELECT sr.*, fa.artist_name as artist_name, fa.artist_mbid as artist_mbid
     FROM seen_releases sr
     INNER JOIN followed_artists fa ON sr.followed_artist_id = fa.id
     WHERE fa.user_id = ?
     ORDER BY sr.release_date IS NULL, sr.release_date DESC, sr.notified_at DESC
     LIMIT ?`,
    [userId, limit]
  )) as (SeenRelease & { artist_name: string; artist_mbid: string })[];
  return rows;
}

export async function updateLastCheckedAt(
  followedArtistId: number,
  isoTimestamp: string
): Promise<void> {
  const repo = getFollowedRepo();
  await repo.update(
    { id: followedArtistId },
    { last_checked_at: isoTimestamp }
  );
}

export async function getUnseenReleaseCount(userId: number): Promise<number> {
  const ds = getDataSource();
  const rows = (await ds.query(
    `SELECT COUNT(sr.id) as count
     FROM seen_releases sr
     INNER JOIN followed_artists fa ON sr.followed_artist_id = fa.id
     LEFT JOIN users u ON u.id = fa.user_id
     WHERE fa.user_id = ?
       AND (u.followed_last_viewed_at IS NULL
            OR sr.notified_at > u.followed_last_viewed_at)`,
    [userId]
  )) as { count: number }[];
  return rows[0]?.count ?? 0;
}

export async function markFollowedReleasesViewed(
  userId: number
): Promise<void> {
  const repo = getDataSource().getRepository(User);
  await repo.update(
    { id: userId },
    { followed_last_viewed_at: new Date().toISOString() }
  );
}
