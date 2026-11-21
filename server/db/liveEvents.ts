import { In } from "typeorm";
import {
  getDataSource,
  FollowedArtist,
  LiveArtist,
  LiveEvent,
  LiveEventPerformer,
  UserLiveEventState,
  User,
} from "./index";
import type {
  LiveEventStatus,
  LiveEventDeletionStatus,
  LiveEventResponse,
} from "./index";

export type SweptPerformer = {
  artist_jambase_id: string;
  artist_name: string;
  is_headliner: boolean;
  performance_rank: number | null;
};

export type SweptEvent = {
  event_key: string;
  name: string;
  event_date: string;
  previous_start_date: string | null;
  event_status: LiveEventStatus;
  venue_name: string | null;
  venue_city: string | null;
  venue_country: string | null;
  venue_lat: number | null;
  venue_lon: number | null;
  ticket_url: string | null;
  image_url: string | null;
  performers: SweptPerformer[];
};

export type Tombstone = {
  event_key: string;
  deletion_status: LiveEventDeletionStatus;
  deleted_at: string | null;
  merged_into: string | null;
};

export type UpsertOutcome = {
  inserted: string[];
  updated: string[];
  statusChanged: string[];
};

export type EventWindow = {
  from: string;
  to: string;
};

export type FollowedEventsQuery = EventWindow;

export type UserLivePreferences = {
  live_lat: number | null;
  live_lon: number | null;
  live_place: string | null;
};

export type HydratedLiveEvent = LiveEvent & {
  performers: LiveEventPerformer[];
  state: UserLiveEventState | null;
};

/**
 * JamBase resolution for one followed artist, with how many users follow them.
 * The two nullable columns carry three states; see `deriveLiveTracking`.
 */
export type ArtistResolutionSummary = {
  follows: number;
  jambase_artist_id: string | null;
  jambase_resolved_at: string | null;
};

/** A followed MBID JamBase has not answered for yet. */
export type UnresolvedArtist = {
  artist_mbid: string;
  artist_name: string;
};

type RawArtistResolution = {
  follows: number | string;
  jambase_artist_id: string | null;
  jambase_resolved_at: string | null;
};

const EARTH_RADIUS_KM = 6371;

/** SQLite hands COUNT() back as whatever the driver feels like. */
function toResolutionSummary(
  row: RawArtistResolution | undefined
): ArtistResolutionSummary {
  return {
    follows: Number(row?.follows ?? 0),
    jambase_artist_id: row?.jambase_artist_id ?? null,
    jambase_resolved_at: row?.jambase_resolved_at ?? null,
  };
}

function eventRepo() {
  return getDataSource().getRepository(LiveEvent);
}

function performerRepo() {
  return getDataSource().getRepository(LiveEventPerformer);
}

function stateRepo() {
  return getDataSource().getRepository(UserLiveEventState);
}

function artistRepo() {
  return getDataSource().getRepository(FollowedArtist);
}

function liveArtistRepo() {
  return getDataSource().getRepository(LiveArtist);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in km. Exported so read-time distance tiers agree. */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function assignEventFields(row: LiveEvent, event: SweptEvent): void {
  row.name = event.name;
  row.event_date = event.event_date;
  row.previous_start_date = event.previous_start_date;
  row.event_status = event.event_status;
  row.venue_name = event.venue_name;
  row.venue_city = event.venue_city;
  row.venue_country = event.venue_country;
  row.venue_lat = event.venue_lat;
  row.venue_lon = event.venue_lon;
  row.ticket_url = event.ticket_url;
  row.image_url = event.image_url;
}

/**
 * Upsert a sweep's results. Idempotent on `event_key`, and safe to run against a
 * partial result set: it only ever writes what it was given, so a sweep that
 * died mid-pagination degrades to "some rows are stale" rather than to data loss.
 *
 * Re-seeing an event clears `disappeared_at`, since the sweep just proved
 * otherwise.
 */
export async function upsertSweptEvents(
  events: readonly SweptEvent[],
  sweptAt: string
): Promise<UpsertOutcome> {
  const outcome: UpsertOutcome = {
    inserted: [],
    updated: [],
    statusChanged: [],
  };
  if (events.length === 0) return outcome;

  await getDataSource().transaction(async (manager) => {
    const eventManager = manager.getRepository(LiveEvent);
    const performerManager = manager.getRepository(LiveEventPerformer);

    for (const event of events) {
      const existing = await eventManager.findOne({
        where: { event_key: event.event_key },
      });

      const row =
        existing ??
        eventManager.create({
          event_key: event.event_key,
          first_seen_at: sweptAt,
        });
      const statusChanged =
        existing !== null && existing.event_status !== event.event_status;

      assignEventFields(row, event);
      row.last_seen_at = sweptAt;
      row.disappeared_at = null;
      if (statusChanged) row.status_changed_at = sweptAt;

      const saved = await eventManager.save(row);

      await performerManager.delete({ event_id: saved.id });
      if (event.performers.length > 0) {
        await performerManager.insert(
          event.performers.map((performer) => ({
            event_id: saved.id,
            artist_jambase_id: performer.artist_jambase_id,
            artist_name: performer.artist_name,
            is_headliner: performer.is_headliner,
            performance_rank: performer.performance_rank,
          }))
        );
      }

      if (existing) outcome.updated.push(event.event_key);
      else outcome.inserted.push(event.event_key);
      if (statusChanged) outcome.statusChanged.push(event.event_key);
    }
  });

  return outcome;
}

/**
 * Tombstones are the authoritative removal signal on delta pages. `merged` is
 * not a deletion: the row is repointed at its survivor so anything holding the
 * old key can follow it.
 */
export async function applyTombstones(
  tombstones: readonly Tombstone[]
): Promise<number> {
  if (tombstones.length === 0) return 0;
  let applied = 0;

  await getDataSource().transaction(async (manager) => {
    const events = manager.getRepository(LiveEvent);
    for (const tombstone of tombstones) {
      const result = await events.update(
        { event_key: tombstone.event_key },
        {
          deletion_status: tombstone.deletion_status,
          merged_into: tombstone.merged_into,
          disappeared_at: tombstone.deleted_at,
        }
      );
      applied += result.affected ?? 0;
    }
  });

  return applied;
}

async function hydrate(
  events: LiveEvent[],
  userId: number
): Promise<HydratedLiveEvent[]> {
  if (events.length === 0) return [];
  const ids = events.map((event) => event.id);

  const [performers, states] = await Promise.all([
    performerRepo().find({ where: { event_id: In(ids) } }),
    stateRepo().find({ where: { user_id: userId, event_id: In(ids) } }),
  ]);

  const performersByEvent = new Map<number, LiveEventPerformer[]>();
  for (const performer of performers) {
    const list = performersByEvent.get(performer.event_id) ?? [];
    list.push(performer);
    performersByEvent.set(performer.event_id, list);
  }
  const stateByEvent = new Map(states.map((state) => [state.event_id, state]));

  return events.map((event) => ({
    ...event,
    performers: performersByEvent.get(event.id) ?? [],
    state: stateByEvent.get(event.id) ?? null,
  }));
}

/** Events in a window whose lineup includes an artist this user follows. */
export async function findFollowedUpcomingEvents(
  userId: number,
  query: FollowedEventsQuery
): Promise<HydratedLiveEvent[]> {
  const builder = eventRepo()
    .createQueryBuilder("e")
    .innerJoin(LiveEventPerformer, "p", "p.event_id = e.id")
    .innerJoin(LiveArtist, "la", "la.jambase_artist_id = p.artist_jambase_id")
    .innerJoin(
      FollowedArtist,
      "fa",
      "fa.artist_mbid = la.artist_mbid AND fa.user_id = :userId",
      { userId }
    )
    .where("e.event_date >= :from AND e.event_date <= :to", {
      from: query.from,
      to: query.to,
    })
    .andWhere("e.deletion_status IS NULL")
    .andWhere("e.disappeared_at IS NULL");

  const events = await builder
    .distinct(true)
    .orderBy("e.event_date", "ASC")
    .getMany();

  return hydrate(events, userId);
}

export async function findEventsForArtist(
  userId: number,
  jambaseArtistId: string,
  options: { includePast?: boolean; now: string }
): Promise<HydratedLiveEvent[]> {
  const builder = eventRepo()
    .createQueryBuilder("e")
    .innerJoin(
      LiveEventPerformer,
      "p",
      "p.event_id = e.id AND p.artist_jambase_id = :jambaseArtistId",
      { jambaseArtistId }
    )
    .where("e.deletion_status IS NULL");

  if (!options.includePast) {
    builder.andWhere("e.event_date >= :now", { now: options.now });
  }

  const events = await builder.orderBy("e.event_date", "ASC").getMany();
  return hydrate(events, userId);
}

/** Upcoming shows the user said they are going to, in date order, whatever their status. */
export async function findGoingForUser(
  userId: number,
  now: string
): Promise<HydratedLiveEvent[]> {
  const events = await eventRepo()
    .createQueryBuilder("e")
    .innerJoin(
      UserLiveEventState,
      "s",
      "s.event_id = e.id AND s.user_id = :userId AND s.response = 'going'",
      { userId }
    )
    .where("e.deletion_status IS NULL")
    .andWhere("e.event_date >= :now", { now })
    .orderBy("e.event_date", "ASC")
    .getMany();

  return hydrate(events, userId);
}

async function upsertState(
  userId: number,
  eventId: number,
  patch: Partial<UserLiveEventState>
): Promise<UserLiveEventState> {
  const repo = stateRepo();
  const existing = await repo.findOne({
    where: { user_id: userId, event_id: eventId },
  });
  const row = existing ?? repo.create({ user_id: userId, event_id: eventId });
  return repo.save(Object.assign(row, patch));
}

export async function setUserResponse(
  userId: number,
  eventId: number,
  response: LiveEventResponse | null,
  at: string
): Promise<UserLiveEventState> {
  return upsertState(userId, eventId, {
    response,
    responded_at: response === null ? null : at,
  });
}

export async function markViewed(
  userId: number,
  eventId: number,
  at: string
): Promise<UserLiveEventState> {
  return upsertState(userId, eventId, { viewed_at: at });
}

export async function markNotified(
  userId: number,
  eventId: number,
  at: string
): Promise<UserLiveEventState> {
  return upsertState(userId, eventId, { notified_at: at });
}

/** Store JamBase's answer for an artist: its id, or null for a confirmed miss. */
export async function recordArtistResolution(
  artistMbid: string,
  jambaseArtistId: string | null,
  resolvedAt: string
): Promise<void> {
  await liveArtistRepo().upsert(
    {
      artist_mbid: artistMbid,
      jambase_artist_id: jambaseArtistId,
      resolved_at: resolvedAt,
    },
    ["artist_mbid"]
  );
}

/**
 * Followed artists JamBase has not answered for, one entry per MBID however
 * many users follow them, longest-waiting first. A confirmed miss has a row, so
 * an artist JamBase has never heard of is not looked up again.
 */
export async function findUnresolvedFollowedArtists(
  limit: number
): Promise<UnresolvedArtist[]> {
  return artistRepo()
    .createQueryBuilder("fa")
    .leftJoin(LiveArtist, "la", "la.artist_mbid = fa.artist_mbid")
    .select("fa.artist_mbid", "artist_mbid")
    .addSelect("MIN(fa.artist_name)", "artist_name")
    .addSelect("MIN(fa.created_at)", "first_followed_at")
    .where("la.artist_mbid IS NULL")
    .groupBy("fa.artist_mbid")
    .orderBy("first_followed_at", "ASC")
    .limit(limit)
    .getRawMany<UnresolvedArtist & { first_followed_at: string }>()
    .then((rows) =>
      rows.map(({ artist_mbid, artist_name }) => ({ artist_mbid, artist_name }))
    );
}

/**
 * The JamBase id for an MBID somebody follows. Artist pages key off MBIDs, but
 * events key off JamBase ids, and this is the only bridge that does not involve
 * matching names. An artist nobody follows any more is no longer swept, so its
 * stored dates are stale and it gets null like any unfollowed artist.
 */
export async function findJambaseIdForArtistMbid(
  artistMbid: string
): Promise<string | null> {
  const row = await liveArtistRepo()
    .createQueryBuilder("la")
    .innerJoin(FollowedArtist, "fa", "fa.artist_mbid = la.artist_mbid")
    .select("la.jambase_artist_id", "jambase_artist_id")
    .where("la.artist_mbid = :artistMbid", { artistMbid })
    .andWhere("la.jambase_artist_id IS NOT NULL")
    .limit(1)
    .getRawOne<{ jambase_artist_id: string }>();
  return row?.jambase_artist_id ?? null;
}

function resolutionQuery() {
  return artistRepo()
    .createQueryBuilder("fa")
    .leftJoin(LiveArtist, "la", "la.artist_mbid = fa.artist_mbid")
    .select("COUNT(fa.id)", "follows")
    .addSelect("MAX(la.jambase_artist_id)", "jambase_artist_id")
    .addSelect("MAX(la.resolved_at)", "jambase_resolved_at");
}

/**
 * One row per distinct followed artist. `follows` separates "nobody follows
 * them" from "followed but not yet attempted", which the null columns cannot.
 */
export async function listArtistResolutions(): Promise<
  ArtistResolutionSummary[]
> {
  const rows = await resolutionQuery()
    .groupBy("fa.artist_mbid")
    .getRawMany<RawArtistResolution>();
  return rows.map(toResolutionSummary);
}

/** The same state for one MBID. `follows` is 0 when nobody follows it. */
export async function findArtistResolution(
  artistMbid: string
): Promise<ArtistResolutionSummary> {
  const row = await resolutionQuery()
    .where("fa.artist_mbid = :artistMbid", { artistMbid })
    .getRawOne<RawArtistResolution>();

  return toResolutionSummary(row);
}

/** JamBase's stored answer for each of these MBIDs that has one. */
export async function findLiveArtists(
  artistMbids: readonly string[]
): Promise<LiveArtist[]> {
  if (artistMbids.length === 0) return [];
  return liveArtistRepo().find({
    where: { artist_mbid: In([...artistMbids]) },
  });
}

/** Distinct JamBase ids of artists somebody follows, for batched sweeps. */
export async function listFollowedJambaseIds(): Promise<string[]> {
  const rows = await liveArtistRepo()
    .createQueryBuilder("la")
    .innerJoin(FollowedArtist, "fa", "fa.artist_mbid = la.artist_mbid")
    .select("DISTINCT la.jambase_artist_id", "jambase_artist_id")
    .where("la.jambase_artist_id IS NOT NULL")
    .getRawMany<{ jambase_artist_id: string }>();
  return rows.map((row) => row.jambase_artist_id);
}

/** A followed artist JamBase knows, with the id their events key off. */
export type FollowedTourArtist = {
  artist_mbid: string;
  artist_name: string;
  jambase_artist_id: string;
};

/** This user's followed artists that resolved to a JamBase id. */
export async function listFollowedTourArtists(
  userId: number
): Promise<FollowedTourArtist[]> {
  return artistRepo()
    .createQueryBuilder("fa")
    .innerJoin(LiveArtist, "la", "la.artist_mbid = fa.artist_mbid")
    .select("fa.artist_mbid", "artist_mbid")
    .addSelect("fa.artist_name", "artist_name")
    .addSelect("la.jambase_artist_id", "jambase_artist_id")
    .where("fa.user_id = :userId", { userId })
    .andWhere("la.jambase_artist_id IS NOT NULL")
    .orderBy("fa.artist_name", "ASC")
    .getRawMany<FollowedTourArtist>();
}

/** Users who follow at least one resolved artist, i.e. who could be notified. */
export async function listUsersWithResolvedFollows(): Promise<number[]> {
  const rows = await artistRepo()
    .createQueryBuilder("fa")
    .innerJoin(LiveArtist, "la", "la.artist_mbid = fa.artist_mbid")
    .select("DISTINCT fa.user_id", "user_id")
    .where("la.jambase_artist_id IS NOT NULL")
    .getRawMany<{ user_id: number }>();
  return rows.map((row) => row.user_id);
}

export async function getUserLivePreferences(
  userId: number
): Promise<UserLivePreferences | null> {
  const row = await getDataSource()
    .getRepository(User)
    .findOne({ where: { id: userId } });
  if (!row) return null;

  return {
    live_lat: row.live_lat,
    live_lon: row.live_lon,
    live_place: row.live_place,
  };
}

export async function setUserLivePreferences(
  userId: number,
  patch: Partial<UserLivePreferences>
): Promise<void> {
  await getDataSource().getRepository(User).update({ id: userId }, patch);
}
