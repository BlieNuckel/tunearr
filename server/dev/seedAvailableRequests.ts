import { getDataSource, Request } from "../db/index";

export type SeedAvailableRequest = {
  albumMbid: string;
  artistName: string;
  albumTitle: string;
  /** Hours before the seed run that Lidarr imported it. */
  arrivedHoursAgo: number;
  dismissed: boolean;
  note: string;
};

type AvailableRequestRow = Pick<
  Request,
  | "user_id"
  | "album_mbid"
  | "artist_name"
  | "album_title"
  | "status"
  | "lidarr_status"
  | "approved_by"
  | "approved_at"
  | "available_at"
  | "highlight_dismissed_at"
>;

const HOUR_MS = 3_600_000;

/** One row per state Home highlights can show an arrived request in. */
export const SEED_AVAILABLE_REQUESTS: SeedAvailableRequest[] = [
  {
    albumMbid: "48140466-cff6-3222-bd55-63c27e43190d",
    artistName: "Portishead",
    albumTitle: "Dummy",
    arrivedHoursAgo: 2,
    dismissed: false,
    note: "highlights: request arrived this morning",
  },
  {
    albumMbid: "b8048f24-c026-3398-b23a-b5e50716cbc7",
    artistName: "Radiohead",
    albumTitle: "The Bends",
    arrivedHoursAgo: 50,
    dismissed: false,
    note: "highlights: request arrived two days ago",
  },
  {
    albumMbid: "b1392450-e666-3926-a536-22c65f834433",
    artistName: "Radiohead",
    albumTitle: "OK Computer",
    arrivedHoursAgo: 30,
    dismissed: true,
    note: "dismissed: hidden from highlights",
  },
  {
    albumMbid: "deadbeef-done-4000-8000-000000000001",
    artistName: "Burial",
    albumTitle: "Untrue",
    arrivedHoursAgo: 10 * 24,
    dismissed: false,
    note: "aged out: arrived before the 7-day highlight window",
  },
];

function isoHoursAgo(hours: number, now: number): string {
  return new Date(now - hours * HOUR_MS).toISOString();
}

/**
 * The stored row for a seed request. Times are relative to the run, so seeding
 * again brings every request back into its intended state.
 */
export function seedAvailableRequestRow(
  seed: SeedAvailableRequest,
  userId: number,
  now: number
): AvailableRequestRow {
  const availableAt = isoHoursAgo(seed.arrivedHoursAgo, now);
  return {
    user_id: userId,
    album_mbid: seed.albumMbid,
    artist_name: seed.artistName,
    album_title: seed.albumTitle,
    status: "approved",
    lidarr_status: "imported",
    approved_by: userId,
    approved_at: isoHoursAgo(seed.arrivedHoursAgo + 1, now),
    available_at: availableAt,
    highlight_dismissed_at: seed.dismissed ? availableAt : null,
  };
}

async function upsertRequest(
  row: AvailableRequestRow
): Promise<"created" | "reset"> {
  const repo = getDataSource().getRepository(Request);
  const existing = await repo.findOne({
    where: { user_id: row.user_id, album_mbid: row.album_mbid },
  });
  if (existing) {
    await repo.update({ id: existing.id }, row);
    return "reset";
  }
  await repo.save(repo.create(row));
  return "created";
}

/** Seeds requests that Lidarr has already imported, so Home can announce them. */
export async function seedAvailableRequests(
  userId: number,
  now: number = Date.now()
): Promise<void> {
  for (const seed of SEED_AVAILABLE_REQUESTS) {
    const outcome = await upsertRequest(
      seedAvailableRequestRow(seed, userId, now)
    );
    console.log(`  ${outcome.padEnd(8)} "${seed.albumTitle}" ${seed.note}`);
  }
}
