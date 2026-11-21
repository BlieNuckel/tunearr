import { getConfig } from "../../config";
import {
  distanceKm,
  findFollowedUpcomingEvents,
  getUserLivePreferences,
  listFollowedTourArtists,
} from "../../db/liveEvents";
import type { HydratedLiveEvent } from "../../db/liveEvents";

export type Origin = { lat: number; lon: number };

export type ArtistTour = {
  artistMbid: string;
  artistName: string;
  jambaseArtistId: string;
  /** Upcoming dates that are still on, in date order. */
  dates: HydratedLiveEvent[];
  /** Closest to the user, or the soonest when there is no location to measure from. */
  closest: HydratedLiveEvent | null;
  distanceKm: number | null;
};

/** A tour with at least one date still on, so it has one to lead with. */
export type TouringArtist = ArtistTour & { closest: HydratedLiveEvent };

export type UserTours = {
  origin: Origin | null;
  tours: ArtistTour[];
  /** Every followed upcoming event, cancelled ones included, for status news. */
  events: HydratedLiveEvent[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** A show's status change older than this is history, not news. */
export const STATUS_NEWS_DAYS = 14;

/** Where this user's dates are measured from, if they have said. */
export async function resolveOrigin(userId: number): Promise<Origin | null> {
  const prefs = await getUserLivePreferences(userId);
  if (prefs?.live_lat == null || prefs.live_lon == null) return null;
  return { lat: prefs.live_lat, lon: prefs.live_lon };
}

function distanceFrom(origin: Origin, event: HydratedLiveEvent): number | null {
  if (event.venue_lat === null || event.venue_lon === null) return null;
  return distanceKm(origin.lat, origin.lon, event.venue_lat, event.venue_lon);
}

/**
 * The date to lead with. A venue without coordinates cannot be "closest", so it
 * is skipped rather than guessed at; if no venue has them, or there is no
 * location, the soonest date leads instead.
 */
export function pickClosest(
  dates: readonly HydratedLiveEvent[],
  origin: Origin | null
): { event: HydratedLiveEvent; distanceKm: number | null } | null {
  if (dates.length === 0) return null;

  if (origin) {
    let best: { event: HydratedLiveEvent; distanceKm: number } | null = null;
    for (const event of dates) {
      const distance = distanceFrom(origin, event);
      if (distance === null) continue;
      if (!best || distance < best.distanceKm) {
        best = { event, distanceKm: distance };
      }
    }
    if (best) return best;
  }

  return { event: dates[0], distanceKm: null };
}

function groupByArtist(
  events: readonly HydratedLiveEvent[],
  jambaseIds: ReadonlySet<string>
): Map<string, HydratedLiveEvent[]> {
  const byArtist = new Map<string, HydratedLiveEvent[]>();
  for (const event of events) {
    for (const performer of event.performers) {
      if (!jambaseIds.has(performer.artist_jambase_id)) continue;
      const list = byArtist.get(performer.artist_jambase_id) ?? [];
      if (!list.includes(event)) list.push(event);
      byArtist.set(performer.artist_jambase_id, list);
    }
  }
  return byArtist;
}

/** Every followed artist JamBase knows, with their upcoming dates and the one to lead with. */
export async function listUserTours(
  userId: number,
  now: number = Date.now()
): Promise<UserTours> {
  const { liveEvents } = getConfig();
  const [origin, artists, events] = await Promise.all([
    resolveOrigin(userId),
    listFollowedTourArtists(userId),
    findFollowedUpcomingEvents(userId, {
      from: new Date(now).toISOString().slice(0, 10),
      to: new Date(now + liveEvents.bannerHorizonDays * DAY_MS)
        .toISOString()
        .slice(0, 10),
    }),
  ]);

  const byArtist = groupByArtist(
    events,
    new Set(artists.map((artist) => artist.jambase_artist_id))
  );

  const tours = artists.map((artist): ArtistTour => {
    const dates = (byArtist.get(artist.jambase_artist_id) ?? [])
      .filter((event) => event.event_status !== "cancelled")
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
    const closest = pickClosest(dates, origin);
    return {
      artistMbid: artist.artist_mbid,
      artistName: artist.artist_name,
      jambaseArtistId: artist.jambase_artist_id,
      dates,
      closest: closest?.event ?? null,
      distanceKm: closest?.distanceKm ?? null,
    };
  });

  return { origin, tours, events };
}

/**
 * Nearest first, by the closest date's distance. A tour with no measurable
 * venue has no distance, so it goes after every measured one; ties, and every
 * tour when there is no location, go by the leading date.
 */
function byDistanceThenDate(a: TouringArtist, b: TouringArtist): number {
  if (a.distanceKm !== b.distanceKm) {
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  }
  const byDate = a.closest.event_date.localeCompare(b.closest.event_date);
  return byDate || a.artistName.localeCompare(b.artistName);
}

/** The followed artists with dates, nearest tour first, for the library list. */
export async function listTouringArtists(
  userId: number,
  now: number = Date.now()
): Promise<{ hasLocation: boolean; tours: TouringArtist[] }> {
  const { origin, tours } = await listUserTours(userId, now);
  return {
    hasLocation: origin !== null,
    tours: tours
      .filter((tour): tour is TouringArtist => tour.closest !== null)
      .sort(byDistanceThenDate),
  };
}
