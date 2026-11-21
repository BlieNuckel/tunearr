import type { Repository } from "typeorm";
import {
  getDataSource,
  FollowedArtist,
  LiveEvent,
  LiveEventPerformer,
  UserLiveEventState,
} from "../db/index";
import type { LiveEventStatus, LiveEventResponse } from "../db/index";
import {
  getUserLivePreferences,
  recordArtistResolution,
  setUserLivePreferences,
} from "../db/liveEvents";
import { listArtistStates, saveArtistState } from "../db/liveArtistState";
import { snapshotOf } from "../services/liveEvents/baseline";
import { listUserTours } from "../services/liveEvents/tours";

export type SeedFollowedArtist = {
  mbid: string;
  name: string;
  jambaseId: string;
};

export type SeedLivePerformer = {
  jambaseId: string;
  name: string;
  isHeadliner: boolean;
};

export type SeedLiveEvent = {
  key: string;
  name: string;
  /** Days from today. Negative is in the past. */
  dayOffset: number;
  /** How long ago we first saw it. */
  seenDaysAgo: number;
  status: LiveEventStatus;
  /** Only set for a non-scheduled status. Under 14 days is news for anyone going. */
  statusChangedDaysAgo?: number;
  previousStartDayOffset?: number;
  venueName: string;
  venueCity: string;
  venueCountry: string;
  /** Null for a venue JamBase gave no coordinates for. */
  lat: number | null;
  lon: number | null;
  ticketUrl: string | null;
  performers: SeedLivePerformer[];
  /** Per-user state for the admin account, so every tab has something in it. */
  adminResponse?: LiveEventResponse;
  adminNotified?: boolean;
  note: string;
};

/** Malmö: the seeded user's location, so tours lead with a closest date. */
const ORIGIN = { lat: 55.605, lon: 13.0038 };

const AMIRALEN = {
  venueName: "Amiralen",
  venueCity: "Malmö",
  venueCountry: "SE",
  lat: 55.5975,
  lon: 13.0072,
};
const PLAN_B = {
  venueName: "Plan B",
  venueCity: "Malmö",
  venueCountry: "SE",
  lat: 55.6031,
  lon: 12.9985,
};
const VEGA = {
  venueName: "VEGA",
  venueCity: "København",
  venueCountry: "DK",
  lat: 55.6605,
  lon: 12.5563,
};
const BERGHAIN = {
  venueName: "Berghain",
  venueCity: "Berlin",
  venueCountry: "DE",
  lat: 52.5111,
  lon: 13.4425,
};

export const SEED_FOLLOWED_ARTISTS: SeedFollowedArtist[] = [
  {
    mbid: "b675f327-4738-4af4-bb83-1adb0003f2d3",
    name: "Yves Tumor",
    jambaseId: "jambase:seed-yves",
  },
  {
    mbid: "7230b2f8-96da-4242-8d57-2a8c1c3d71e4",
    name: "Jockstrap",
    jambaseId: "jambase:seed-jockstrap",
  },
  {
    mbid: "fc6fe95d-ab24-44fd-a086-f33a505ad518",
    name: "bar italia",
    jambaseId: "jambase:seed-bar-italia",
  },
  {
    mbid: "6420dd6b-8232-42db-9cb9-90bec8f40e91",
    name: "Nourished by Time",
    jambaseId: "jambase:seed-nourished",
  },
  {
    mbid: "a74b1b7f-71a5-4011-9441-d0b5e4122711",
    name: "Radiohead",
    jambaseId: "jambase:seed-radiohead",
  },
];

function performer(
  artist: SeedFollowedArtist,
  isHeadliner = true
): SeedLivePerformer {
  return {
    jambaseId: artist.jambaseId,
    name: artist.name,
    isHeadliner,
  };
}

const [YVES, JOCKSTRAP, BAR_ITALIA, NOURISHED, RADIOHEAD] =
  SEED_FOLLOWED_ARTISTS;

/**
 * One row per state the UI can be in, so every surface has something to render
 * without anyone having to reason about the window arithmetic first.
 */
export const SEED_LIVE_EVENTS: SeedLiveEvent[] = [
  {
    key: "jambase:seed-1",
    name: "Yves Tumor at Amiralen",
    dayOffset: 12,
    seenDaysAgo: 2,
    status: "scheduled",
    ...AMIRALEN,
    ticketUrl: "https://example.test/tickets/yves",
    performers: [performer(YVES), performer(JOCKSTRAP, false)],
    note: "Yves Tumor's closest date, 1 km away",
  },
  {
    key: "jambase:seed-2",
    name: "bar italia at Plan B",
    dayOffset: 6,
    seenDaysAgo: 40,
    status: "scheduled",
    ...PLAN_B,
    ticketUrl: "https://example.test/tickets/bar-italia",
    performers: [performer(BAR_ITALIA)],
    note: "bar italia's closest date (the card is seeded as just notified)",
  },
  {
    key: "jambase:seed-3",
    name: "Jockstrap at VEGA",
    dayOffset: 30,
    seenDaysAgo: 30,
    status: "scheduled",
    ...VEGA,
    ticketUrl: "https://example.test/tickets/jockstrap",
    performers: [performer(JOCKSTRAP)],
    note: "Jockstrap in Copenhagen, further than the Malmö date",
  },
  {
    key: "jambase:seed-4",
    name: "Radiohead at Berghain",
    dayOffset: 150,
    seenDaysAgo: 60,
    status: "scheduled",
    ...BERGHAIN,
    ticketUrl: "https://example.test/tickets/radiohead",
    performers: [performer(RADIOHEAD)],
    note: "Radiohead's only upcoming date, 600 km away",
  },
  {
    key: "jambase:seed-5",
    name: "Nourished by Time at Plan B",
    dayOffset: 20,
    seenDaysAgo: 45,
    status: "cancelled",
    // Old enough not to lead Home highlights. Drop this to 1 to see that state.
    statusChangedDaysAgo: 40,
    ...PLAN_B,
    ticketUrl: null,
    performers: [performer(NOURISHED)],
    adminNotified: true,
    note: "cancelled, so Nourished by Time has no dates left",
  },
  {
    key: "jambase:seed-6",
    name: "Yves Tumor at VEGA",
    dayOffset: 60,
    seenDaysAgo: 50,
    status: "rescheduled",
    statusChangedDaysAgo: 35,
    previousStartDayOffset: 25,
    ...VEGA,
    ticketUrl: "https://example.test/tickets/yves-vega",
    performers: [performer(YVES)],
    adminNotified: true,
    note: "rescheduled weeks ago, nobody going: no change card",
  },
  {
    key: "jambase:seed-7",
    name: "Jockstrap at Amiralen",
    dayOffset: 25,
    seenDaysAgo: 20,
    status: "scheduled",
    ...AMIRALEN,
    ticketUrl: "https://example.test/tickets/jockstrap-malmo",
    performers: [performer(JOCKSTRAP)],
    adminResponse: "going",
    adminNotified: true,
    note: "/library/live Going tab; Jockstrap's closest, so no Going button",
  },
  {
    key: "jambase:seed-8",
    name: "bar italia at VEGA",
    dayOffset: 18,
    seenDaysAgo: 15,
    status: "scheduled",
    ...VEGA,
    ticketUrl: "https://example.test/tickets/bar-italia-vega",
    performers: [performer(BAR_ITALIA)],
    adminResponse: "dismissed",
    adminNotified: true,
    note: "/library/live Dismissed tab",
  },
  {
    key: "jambase:seed-9",
    name: "Radiohead at Amiralen",
    dayOffset: -45,
    seenDaysAgo: 120,
    status: "scheduled",
    ...AMIRALEN,
    ticketUrl: "https://example.test/tickets/old",
    performers: [performer(RADIOHEAD)],
    adminNotified: true,
    note: "/library/live Past tab",
  },
  {
    key: "jambase:seed-12",
    name: "bar italia at Plan B (late show)",
    dayOffset: 14,
    seenDaysAgo: 5,
    status: "scheduled",
    ...PLAN_B,
    ticketUrl: null,
    performers: [performer(BAR_ITALIA)],
    note: "second date for the same artist, no ticket link",
  },
  {
    key: "jambase:seed-13",
    name: "Yves Tumor at Plan B",
    dayOffset: 9,
    seenDaysAgo: 30,
    status: "postponed",
    statusChangedDaysAgo: 2,
    ...PLAN_B,
    ticketUrl: "https://example.test/tickets/yves-plan-b",
    performers: [performer(YVES)],
    adminResponse: "going",
    note: "postponed 2 days ago, admin going: urgent card",
  },
  {
    key: "jambase:seed-14",
    name: "Jockstrap at a secret venue",
    dayOffset: 8,
    seenDaysAgo: 10,
    status: "scheduled",
    venueName: "Secret venue",
    venueCity: "Lund",
    venueCountry: "SE",
    lat: null,
    lon: null,
    ticketUrl: null,
    performers: [performer(JOCKSTRAP)],
    note: "no coordinates: soonest Jockstrap date, but skipped for closest",
  },
];

/**
 * Dates `pnpm dev:live announce` adds after the baseline is recorded, so the
 * notifier has something to say: Nourished by Time's first date since its only
 * one was cancelled, and a Radiohead date closer than Berlin.
 */
export const SCENARIO_LIVE_EVENTS: SeedLiveEvent[] = [
  {
    key: "jambase:seed-announce-1",
    name: "Nourished by Time at VEGA",
    dayOffset: 40,
    seenDaysAgo: 0,
    status: "scheduled",
    ...VEGA,
    ticketUrl: "https://example.test/tickets/nourished-vega",
    performers: [performer(NOURISHED)],
    note: 'first date: "Nourished by Time announced a date"',
  },
  {
    key: "jambase:seed-announce-2",
    name: "Radiohead at VEGA",
    dayOffset: 120,
    seenDaysAgo: 0,
    status: "scheduled",
    ...VEGA,
    ticketUrl: "https://example.test/tickets/radiohead-vega",
    performers: [performer(RADIOHEAD)],
    note: 'closer than Berlin: "Radiohead added a date closer to you"',
  },
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function calendarDayOffset(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Puts the seeded user in Malmö so the seeded tours lead with a closest date.
 * Leaves the integration disabled and keyless: seeded rows render from SQLite,
 * and nothing should call JamBase in dev.
 */
async function seedUserLocation(userId: number): Promise<void> {
  const prefs = await getUserLivePreferences(userId);
  if (prefs?.live_lat != null && prefs.live_lon != null) return;
  await setUserLivePreferences(userId, {
    live_lat: ORIGIN.lat,
    live_lon: ORIGIN.lon,
    live_place: "Malmö, Skåne, Sweden",
  });
}

async function seedFollows(
  repo: Repository<FollowedArtist>,
  userId: number
): Promise<number> {
  let created = 0;

  for (const artist of SEED_FOLLOWED_ARTISTS) {
    const existing = await repo.findOne({
      where: { user_id: userId, artist_mbid: artist.mbid },
    });

    await recordArtistResolution(artist.mbid, artist.jambaseId, isoDaysAgo(1));
    if (existing) continue;

    await repo.save(
      repo.create({
        user_id: userId,
        artist_mbid: artist.mbid,
        artist_name: artist.name,
        last_checked_at: isoDaysAgo(1),
      })
    );
    created += 1;
  }

  return created;
}

export async function seedOneEvent(
  seed: SeedLiveEvent,
  userId: number
): Promise<boolean> {
  const ds = getDataSource();
  const eventRepo = ds.getRepository(LiveEvent);
  const performerRepo = ds.getRepository(LiveEventPerformer);
  const stateRepo = ds.getRepository(UserLiveEventState);

  if (await eventRepo.findOne({ where: { event_key: seed.key } })) return false;

  const event = await eventRepo.save(
    eventRepo.create({
      event_key: seed.key,
      name: seed.name,
      event_date: calendarDayOffset(seed.dayOffset),
      previous_start_date:
        seed.previousStartDayOffset === undefined
          ? null
          : calendarDayOffset(seed.previousStartDayOffset),
      event_status: seed.status,
      status_changed_at:
        seed.statusChangedDaysAgo === undefined
          ? null
          : isoDaysAgo(seed.statusChangedDaysAgo),
      venue_name: seed.venueName,
      venue_city: seed.venueCity,
      venue_country: seed.venueCountry,
      venue_lat: seed.lat,
      venue_lon: seed.lon,
      ticket_url: seed.ticketUrl,
      image_url: null,
      first_seen_at: isoDaysAgo(seed.seenDaysAgo),
      last_seen_at: isoDaysAgo(0),
      disappeared_at: null,
      deletion_status: null,
      merged_into: null,
    })
  );

  await performerRepo.insert(
    seed.performers.map((p, index) => ({
      event_id: event.id,
      artist_jambase_id: p.jambaseId,
      artist_name: p.name,
      is_headliner: p.isHeadliner,
      performance_rank: index + 1,
    }))
  );

  if (seed.adminResponse || seed.adminNotified) {
    await stateRepo.save(
      stateRepo.create({
        user_id: userId,
        event_id: event.id,
        response: seed.adminResponse ?? null,
        responded_at: seed.adminResponse ? isoDaysAgo(2) : null,
        viewed_at: null,
        notified_at: seed.adminNotified ? isoDaysAgo(2) : null,
      })
    );
  }

  return true;
}

/**
 * Seed dates are relative to the day the seed runs, so rows from an earlier run
 * drift into the past. Each run replaces them (performers and per-user state go
 * with them) and resets the seeded artists' tour baselines, which also undoes
 * `pnpm dev:live announce`.
 */
async function clearSeededLiveEvents(userId: number): Promise<number> {
  const ds = getDataSource();
  const [{ count }] = (await ds.query(
    "SELECT COUNT(*) AS count FROM live_events WHERE event_key LIKE 'jambase:seed-%'"
  )) as { count: number }[];
  await ds.query(
    "DELETE FROM live_events WHERE event_key LIKE 'jambase:seed-%'"
  );

  const mbids = SEED_FOLLOWED_ARTISTS.map((artist) => artist.mbid);
  await ds.query(
    `DELETE FROM user_live_artist_state
     WHERE user_id = ? AND artist_mbid IN (${mbids.map(() => "?").join(", ")})`,
    [userId, ...mbids]
  );
  return Number(count);
}

export async function seedLiveEvents(userId: number): Promise<void> {
  await seedUserLocation(userId);
  const cleared = await clearSeededLiveEvents(userId);
  if (cleared > 0) {
    console.log(`  replaced ${cleared} live event(s) from an earlier run`);
  }

  const follows = await seedFollows(
    getDataSource().getRepository(FollowedArtist),
    userId
  );
  console.log(`  followed ${follows} artist(s) for the live surfaces`);

  let created = 0;
  let skipped = 0;

  for (const seed of SEED_LIVE_EVENTS) {
    if (await seedOneEvent(seed, userId)) {
      console.log(`  ${seed.key.padEnd(18)} ${seed.note}`);
      created += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(`  created ${created} live event(s), skipped ${skipped}`);

  if (await seedFreshTour(userId, BAR_ITALIA)) {
    console.log(
      `  ${BAR_ITALIA.name} marked as just notified ("New tour dates")`
    );
  }
}

/**
 * Records one artist as notified two days ago, so Home shows the "New tour
 * dates" card without a JamBase key. Every other artist is left without a
 * baseline, which Home records silently on first load, like a new follow.
 */
async function seedFreshTour(
  userId: number,
  artist: SeedFollowedArtist
): Promise<boolean> {
  const existing = await listArtistStates(userId);
  if (existing.some((state) => state.artist_mbid === artist.mbid)) return false;

  const { origin, tours } = await listUserTours(userId);
  const tour = tours.find((t) => t.artistMbid === artist.mbid);
  if (!tour) return false;

  await saveArtistState(userId, artist.mbid, {
    ...snapshotOf(tour, origin, isoDaysAgo(2)),
    notified_at: isoDaysAgo(2),
  });
  return true;
}
