import { getDataSource, FollowedArtist, FollowedRelease } from "../db/index";
import { SEED_FOLLOWED_ARTISTS } from "./seedLiveEvents";

export type SeedFollowedRelease = {
  artistMbid: string;
  releaseKey: string;
  title: string;
  /** Real release group, so the album page and cover art resolve. Null exercises the search fallback. */
  releaseGroupMbid: string | null;
  releaseType: "Album" | "EP" | "Single";
  /** Days before the seed run. Recent releases are dated as if they just came out. */
  releasedDaysAgo: number;
  viewed: boolean;
  dismissed: boolean;
  note: string;
};

type FollowedReleaseRow = Pick<
  FollowedRelease,
  | "followed_artist_id"
  | "release_key"
  | "album_title"
  | "release_date"
  | "release_group_mbid"
  | "cover_url"
  | "release_type"
  | "secondary_types"
  | "viewed_at"
  | "dismissed_at"
>;

const DAY_MS = 86_400_000;

const [YVES, JOCKSTRAP, BAR_ITALIA, NOURISHED, RADIOHEAD] =
  SEED_FOLLOWED_ARTISTS;

/** One row per state Home highlights can show a release in. */
export const SEED_FOLLOWED_RELEASES: SeedFollowedRelease[] = [
  {
    artistMbid: BAR_ITALIA.mbid,
    releaseKey: "seed:bar-italia-the-twits",
    title: "The Twits",
    releaseGroupMbid: "f98d24c6-56bc-452c-b785-106ea3b30e2e",
    releaseType: "Album",
    releasedDaysAgo: 0,
    viewed: false,
    dismissed: false,
    note: "highlights: new album out today, unseen",
  },
  {
    artistMbid: JOCKSTRAP.mbid,
    releaseKey: "seed:jockstrap-greatest-hits",
    title: "Greatest Hits",
    releaseGroupMbid: "addd1a3b-6a53-4318-9af1-03802146a401",
    releaseType: "EP",
    releasedDaysAgo: 1,
    viewed: false,
    dismissed: false,
    note: "highlights: new EP from yesterday, unseen",
  },
  {
    artistMbid: RADIOHEAD.mbid,
    releaseKey: "seed:radiohead-in-rainbows",
    title: "In Rainbows",
    releaseGroupMbid: "6e335887-60ba-38f0-95af-fae7774336bf",
    releaseType: "Album",
    releasedDaysAgo: 9,
    viewed: false,
    dismissed: false,
    note: "highlights: unseen album, older in the window",
  },
  {
    artistMbid: YVES.mbid,
    releaseKey: "seed:yves-tumor-wild-at-heart",
    title: "Wild at Heart",
    releaseGroupMbid: "f1ac6432-e81b-460f-a543-63c66350435c",
    releaseType: "EP",
    releasedDaysAgo: 3,
    viewed: true,
    dismissed: false,
    note: "highlights: already opened, ranks below news",
  },
  {
    artistMbid: NOURISHED.mbid,
    releaseKey: "seed:nourished-miss-you",
    title: "Miss You",
    releaseGroupMbid: null,
    releaseType: "Single",
    releasedDaysAgo: 5,
    viewed: false,
    dismissed: false,
    note: "highlights: no MusicBrainz match yet, no cover, search link",
  },
  {
    artistMbid: JOCKSTRAP.mbid,
    releaseKey: "seed:jockstrap-good-girl",
    title: "Good Girl",
    releaseGroupMbid: "d71764ac-1632-48a5-967b-0f7ea8754ed6",
    releaseType: "Single",
    releasedDaysAgo: 2,
    viewed: false,
    dismissed: true,
    note: "dismissed: hidden from highlights",
  },
  {
    artistMbid: RADIOHEAD.mbid,
    releaseKey: "seed:radiohead-knives-out",
    title: "Knives Out",
    releaseGroupMbid: "62bfe814-969e-3dfb-9dc9-88d7a7d23c94",
    releaseType: "Single",
    releasedDaysAgo: 20,
    viewed: false,
    dismissed: false,
    note: "aged out: older than the 14-day highlight window",
  },
];

function isoDaysAgo(days: number, now: number): string {
  return new Date(now - days * DAY_MS).toISOString();
}

function coverUrl(releaseGroupMbid: string | null): string | null {
  return releaseGroupMbid
    ? `https://coverartarchive.org/release-group/${releaseGroupMbid}/front-500`
    : null;
}

/**
 * The stored row for a seed release. Dates and read state are relative to the
 * run, so seeding again brings every release back into its intended state.
 */
export function seedReleaseRow(
  seed: SeedFollowedRelease,
  followedArtistId: number,
  now: number
): FollowedReleaseRow {
  return {
    followed_artist_id: followedArtistId,
    release_key: seed.releaseKey,
    album_title: seed.title,
    release_date: isoDaysAgo(seed.releasedDaysAgo, now).slice(0, 10),
    release_group_mbid: seed.releaseGroupMbid,
    cover_url: coverUrl(seed.releaseGroupMbid),
    release_type: seed.releaseType,
    secondary_types: JSON.stringify([]),
    viewed_at: seed.viewed ? isoDaysAgo(0, now) : null,
    dismissed_at: seed.dismissed ? isoDaysAgo(0, now) : null,
  };
}

async function upsertRelease(
  row: FollowedReleaseRow
): Promise<"created" | "reset"> {
  const repo = getDataSource().getRepository(FollowedRelease);
  const existing = await repo.findOne({
    where: {
      followed_artist_id: row.followed_artist_id,
      release_key: row.release_key,
    },
  });
  if (existing) {
    await repo.update({ id: existing.id }, row);
    return "reset";
  }
  await repo.save(repo.create(row));
  return "created";
}

/** Seeds releases for the artists `seedLiveEvents` follows, so it must run after it. */
export async function seedFollowedReleases(
  userId: number,
  now: number = Date.now()
): Promise<void> {
  const follows = await getDataSource()
    .getRepository(FollowedArtist)
    .find({ where: { user_id: userId } });
  const followIdByMbid = new Map(follows.map((f) => [f.artist_mbid, f.id]));

  for (const seed of SEED_FOLLOWED_RELEASES) {
    const followedArtistId = followIdByMbid.get(seed.artistMbid);
    if (followedArtistId === undefined) {
      console.log(`  skipping "${seed.title}": artist not followed`);
      continue;
    }
    const outcome = await upsertRelease(
      seedReleaseRow(seed, followedArtistId, now)
    );
    console.log(`  ${outcome.padEnd(8)} "${seed.title}" ${seed.note}`);
  }
}
