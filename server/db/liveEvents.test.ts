import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "./index";
import type { SweptEvent, SweptPerformer } from "./liveEvents";
import {
  distanceKm,
  upsertSweptEvents,
  applyTombstones,
  findFollowedUpcomingEvents,
  findEventsForArtist,
  findGoingForUser,
  setUserResponse,
  markViewed,
  markNotified,
  recordArtistResolution,
  listUsersWithResolvedFollows,
  findArtistResolution,
  listArtistResolutions,
  findUnresolvedFollowedArtists,
  findJambaseIdForArtistMbid,
  listFollowedJambaseIds,
  getUserLivePreferences,
  setUserLivePreferences,
} from "./liveEvents";

const MALMO = { lat: 55.605, lon: 13.0038 };
const COPENHAGEN = { lat: 55.6761, lon: 12.5683 };
const BERLIN = { lat: 52.52, lon: 13.405 };

const SWEPT_AT = "2026-08-17T09:00:00.000Z";
const WINDOW = { from: "2026-08-17", to: "2026-12-31" };

async function markDisappeared(eventKey: string, at: string): Promise<void> {
  await getDataSource().query(
    "UPDATE live_events SET disappeared_at = ? WHERE event_key = ?",
    [at, eventKey]
  );
}

function performer(overrides: Partial<SweptPerformer> = {}): SweptPerformer {
  return {
    artist_jambase_id: "jambase:1",
    artist_name: "Yves Tumor",
    is_headliner: true,
    performance_rank: 1,
    ...overrides,
  };
}

function event(overrides: Partial<SweptEvent> = {}): SweptEvent {
  return {
    event_key: "jambase:100",
    name: "Yves Tumor at Amiralen",
    event_date: "2026-08-30",
    previous_start_date: null,
    event_status: "scheduled",
    venue_name: "Amiralen",
    venue_city: "Malmö",
    venue_country: "SE",
    venue_lat: MALMO.lat,
    venue_lon: MALMO.lon,
    ticket_url: "https://example.test/tickets",
    image_url: null,
    performers: [performer()],
    ...overrides,
  };
}

async function createUser(username: string): Promise<number> {
  await getDataSource().query("INSERT INTO users (username) VALUES (?)", [
    username,
  ]);
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM users WHERE username = ?",
    [username]
  )) as { id: number }[];
  return id;
}

async function follow(
  userId: number,
  artistMbid: string,
  artistName: string,
  jambaseArtistId: string | null
): Promise<number> {
  await getDataSource().query(
    `INSERT INTO followed_artists (user_id, artist_mbid, artist_name)
     VALUES (?, ?, ?)`,
    [userId, artistMbid, artistName]
  );
  if (jambaseArtistId !== null) {
    await recordArtistResolution(artistMbid, jambaseArtistId, SWEPT_AT);
  }
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM followed_artists WHERE user_id = ? AND artist_mbid = ?",
    [userId, artistMbid]
  )) as { id: number }[];
  return id;
}

async function eventIdFor(eventKey: string): Promise<number> {
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM live_events WHERE event_key = ?",
    [eventKey]
  )) as { id: number }[];
  return id;
}

beforeEach(async () => {
  await initializeDatabase(":memory:");
});

afterEach(async () => {
  await closeDatabase();
});

describe("distanceKm", () => {
  it("measures Malmö to Copenhagen at roughly 28 km", () => {
    const km = distanceKm(MALMO.lat, MALMO.lon, COPENHAGEN.lat, COPENHAGEN.lon);
    expect(km).toBeGreaterThan(25);
    expect(km).toBeLessThan(32);
  });

  it("returns zero for the same point", () => {
    expect(distanceKm(MALMO.lat, MALMO.lon, MALMO.lat, MALMO.lon)).toBe(0);
  });
});

describe("upsertSweptEvents", () => {
  it("inserts new events with their lineup", async () => {
    const outcome = await upsertSweptEvents([event()], SWEPT_AT);

    expect(outcome.inserted).toEqual(["jambase:100"]);
    expect(outcome.updated).toEqual([]);

    const rows = await getDataSource().query(
      "SELECT event_key, first_seen_at, last_seen_at FROM live_events"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].first_seen_at).toBe(SWEPT_AT);

    const performers = await getDataSource().query(
      "SELECT artist_jambase_id, is_headliner FROM live_event_performers"
    );
    expect(performers).toHaveLength(1);
    expect(performers[0].artist_jambase_id).toBe("jambase:1");
  });

  it("is idempotent on event_key and preserves first_seen_at", async () => {
    await upsertSweptEvents([event()], SWEPT_AT);
    const later = "2026-08-18T09:00:00.000Z";
    const outcome = await upsertSweptEvents([event()], later);

    expect(outcome.inserted).toEqual([]);
    expect(outcome.updated).toEqual(["jambase:100"]);

    const rows = await getDataSource().query(
      "SELECT first_seen_at, last_seen_at FROM live_events"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].first_seen_at).toBe(SWEPT_AT);
    expect(rows[0].last_seen_at).toBe(later);
  });

  it("sets status_changed_at only when the status actually changes", async () => {
    await upsertSweptEvents([event()], SWEPT_AT);
    let rows = await getDataSource().query(
      "SELECT status_changed_at FROM live_events"
    );
    expect(rows[0].status_changed_at).toBeNull();

    await upsertSweptEvents([event()], "2026-08-18T09:00:00.000Z");
    rows = await getDataSource().query(
      "SELECT status_changed_at FROM live_events"
    );
    expect(rows[0].status_changed_at).toBeNull();

    const changedAt = "2026-08-19T09:00:00.000Z";
    const outcome = await upsertSweptEvents(
      [event({ event_status: "cancelled" })],
      changedAt
    );
    expect(outcome.statusChanged).toEqual(["jambase:100"]);
    rows = await getDataSource().query(
      "SELECT status_changed_at, event_status FROM live_events"
    );
    expect(rows[0].status_changed_at).toBe(changedAt);
    expect(rows[0].event_status).toBe("cancelled");
  });

  it("replaces the lineup rather than accumulating it", async () => {
    await upsertSweptEvents(
      [
        event({
          performers: [
            performer(),
            performer({ artist_jambase_id: "jambase:2" }),
          ],
        }),
      ],
      SWEPT_AT
    );
    await upsertSweptEvents([event({ performers: [performer()] })], SWEPT_AT);

    const performers = await getDataSource().query(
      "SELECT artist_jambase_id FROM live_event_performers"
    );
    expect(performers).toHaveLength(1);
  });

  it("clears disappeared_at when an event is seen again", async () => {
    await upsertSweptEvents([event()], SWEPT_AT);
    await markDisappeared("jambase:100", SWEPT_AT);

    await upsertSweptEvents([event()], "2026-08-18T09:00:00.000Z");
    const rows = await getDataSource().query(
      "SELECT disappeared_at FROM live_events"
    );
    expect(rows[0].disappeared_at).toBeNull();
  });

  it("handles an empty sweep without touching anything", async () => {
    const outcome = await upsertSweptEvents([], SWEPT_AT);
    expect(outcome).toEqual({ inserted: [], updated: [], statusChanged: [] });
  });

  it("stores an event with no lineup", async () => {
    await upsertSweptEvents([event({ performers: [] })], SWEPT_AT);
    const performers = await getDataSource().query(
      "SELECT * FROM live_event_performers"
    );
    expect(performers).toHaveLength(0);
  });
});

describe("applyTombstones", () => {
  it("records a deletion", async () => {
    await upsertSweptEvents([event()], SWEPT_AT);
    const applied = await applyTombstones([
      {
        event_key: "jambase:100",
        deletion_status: "deleted",
        deleted_at: "2026-08-20T00:00:00.000Z",
        merged_into: null,
      },
    ]);

    expect(applied).toBe(1);
    const rows = await getDataSource().query(
      "SELECT deletion_status, disappeared_at, merged_into FROM live_events"
    );
    expect(rows[0].deletion_status).toBe("deleted");
    expect(rows[0].disappeared_at).toBe("2026-08-20T00:00:00.000Z");
    expect(rows[0].merged_into).toBeNull();
  });

  it("repoints a merged event at its survivor", async () => {
    await upsertSweptEvents([event()], SWEPT_AT);
    await applyTombstones([
      {
        event_key: "jambase:100",
        deletion_status: "merged",
        deleted_at: null,
        merged_into: "jambase:999",
      },
    ]);

    const rows = await getDataSource().query(
      "SELECT deletion_status, merged_into FROM live_events"
    );
    expect(rows[0].deletion_status).toBe("merged");
    expect(rows[0].merged_into).toBe("jambase:999");
  });

  it("ignores a tombstone for an event we never stored", async () => {
    expect(
      await applyTombstones([
        {
          event_key: "jambase:nope",
          deletion_status: "deleted",
          deleted_at: SWEPT_AT,
          merged_into: null,
        },
      ])
    ).toBe(0);
  });
});

describe("findFollowedUpcomingEvents", () => {
  let userId: number;

  beforeEach(async () => {
    userId = await createUser("lasse");
    await follow(userId, "mbid-yves", "Yves Tumor", "jambase:1");
    await upsertSweptEvents(
      [
        event(),
        event({
          event_key: "jambase:200",
          event_date: "2026-09-15",
          venue_country: "DE",
          venue_city: "Berlin",
          venue_lat: BERLIN.lat,
          venue_lon: BERLIN.lon,
        }),
        event({
          event_key: "jambase:300",
          performers: [performer({ artist_jambase_id: "jambase:99" })],
        }),
      ],
      SWEPT_AT
    );
  });

  it("returns only events whose lineup includes a followed artist", async () => {
    const events = await findFollowedUpcomingEvents(userId, WINDOW);
    expect(events.map((e) => e.event_key)).toEqual([
      "jambase:100",
      "jambase:200",
    ]);
  });

  it("excludes disappeared and tombstoned events", async () => {
    await markDisappeared("jambase:100", SWEPT_AT);
    await applyTombstones([
      {
        event_key: "jambase:200",
        deletion_status: "trashed",
        deleted_at: SWEPT_AT,
        merged_into: null,
      },
    ]);
    expect(await findFollowedUpcomingEvents(userId, WINDOW)).toEqual([]);
  });

  it("does not leak another user's follows", async () => {
    const other = await createUser("someone-else");
    expect(await findFollowedUpcomingEvents(other, WINDOW)).toEqual([]);
  });

  it("returns one row per event even when two followed artists share a bill", async () => {
    await follow(userId, "mbid-other", "Support Act", "jambase:2");
    await upsertSweptEvents(
      [
        event({
          event_key: "jambase:400",
          performers: [
            performer(),
            performer({ artist_jambase_id: "jambase:2", is_headliner: false }),
          ],
        }),
      ],
      SWEPT_AT
    );

    const events = await findFollowedUpcomingEvents(userId, WINDOW);
    const keys = events.map((e) => e.event_key);
    expect(keys.filter((key) => key === "jambase:400")).toHaveLength(1);
  });

  it("hydrates the lineup and the user's state", async () => {
    const eventId = await eventIdFor("jambase:100");
    await setUserResponse(userId, eventId, "going", SWEPT_AT);

    const events = await findFollowedUpcomingEvents(userId, WINDOW);
    const target = events.find((e) => e.event_key === "jambase:100");
    expect(target?.performers).toHaveLength(1);
    expect(target?.state?.response).toBe("going");
  });
});

describe("findEventsForArtist", () => {
  let userId: number;

  beforeEach(async () => {
    userId = await createUser("lasse");
    await upsertSweptEvents(
      [
        event({ event_key: "jambase:past", event_date: "2026-01-01" }),
        event({ event_key: "jambase:future", event_date: "2026-12-01" }),
      ],
      SWEPT_AT
    );
  });

  it("returns upcoming dates by default", async () => {
    const events = await findEventsForArtist(userId, "jambase:1", {
      now: "2026-08-17",
    });
    expect(events.map((e) => e.event_key)).toEqual(["jambase:future"]);
  });

  it("includes past dates when asked", async () => {
    const events = await findEventsForArtist(userId, "jambase:1", {
      now: "2026-08-17",
      includePast: true,
    });
    expect(events.map((e) => e.event_key)).toEqual([
      "jambase:past",
      "jambase:future",
    ]);
  });

  it("returns nothing for an artist with no dates", async () => {
    expect(
      await findEventsForArtist(userId, "jambase:absent", { now: "2026-08-17" })
    ).toEqual([]);
  });
});

describe("findGoingForUser", () => {
  let userId: number;

  beforeEach(async () => {
    userId = await createUser("lasse");
    await follow(userId, "mbid-yves", "Yves Tumor", "jambase:1");
    await upsertSweptEvents(
      [
        event({ event_key: "jambase:past", event_date: "2026-01-01" }),
        event({ event_key: "jambase:later", event_date: "2026-12-01" }),
        event({ event_key: "jambase:sooner", event_date: "2026-10-01" }),
        event({ event_key: "jambase:skipped", event_date: "2026-11-01" }),
      ],
      SWEPT_AT
    );
    for (const key of ["jambase:past", "jambase:later", "jambase:sooner"]) {
      await setUserResponse(userId, await eventIdFor(key), "going", SWEPT_AT);
    }
    await setUserResponse(
      userId,
      await eventIdFor("jambase:skipped"),
      "dismissed",
      SWEPT_AT
    );
  });

  it("lists upcoming shows marked going, soonest first", async () => {
    const going = await findGoingForUser(userId, "2026-08-17");
    expect(going.map((e) => e.event_key)).toEqual([
      "jambase:sooner",
      "jambase:later",
    ]);
  });

  it("keeps a show that dropped out of the sweep", async () => {
    await markDisappeared("jambase:later", SWEPT_AT);
    const going = await findGoingForUser(userId, "2026-08-17");
    expect(going.map((e) => e.event_key)).toContain("jambase:later");
  });

  it("keeps a show after the artist is unfollowed", async () => {
    await getDataSource().query("DELETE FROM followed_artists");
    expect(await findGoingForUser(userId, "2026-08-17")).toHaveLength(2);
  });

  it("is per user", async () => {
    const other = await createUser("someone");
    expect(await findGoingForUser(other, "2026-08-17")).toEqual([]);
  });
});

describe("per-user event state", () => {
  let userId: number;
  let eventId: number;

  beforeEach(async () => {
    userId = await createUser("lasse");
    await upsertSweptEvents([event()], SWEPT_AT);
    eventId = await eventIdFor("jambase:100");
  });

  it("creates a row on first write and updates it after", async () => {
    await setUserResponse(userId, eventId, "going", SWEPT_AT);
    await markViewed(userId, eventId, "2026-08-18T00:00:00.000Z");
    await markNotified(userId, eventId, "2026-08-19T00:00:00.000Z");

    const rows = await getDataSource().query(
      "SELECT response, responded_at, viewed_at, notified_at FROM user_live_event_state"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].response).toBe("going");
    expect(rows[0].responded_at).toBe(SWEPT_AT);
    expect(rows[0].viewed_at).toBe("2026-08-18T00:00:00.000Z");
    expect(rows[0].notified_at).toBe("2026-08-19T00:00:00.000Z");
  });

  it("clears responded_at when the response is cleared", async () => {
    await setUserResponse(userId, eventId, "dismissed", SWEPT_AT);
    await setUserResponse(userId, eventId, null, "2026-08-20T00:00:00.000Z");

    const rows = await getDataSource().query(
      "SELECT response, responded_at FROM user_live_event_state"
    );
    expect(rows[0].response).toBeNull();
    expect(rows[0].responded_at).toBeNull();
  });

  it("keeps state per user", async () => {
    const other = await createUser("someone-else");
    await setUserResponse(userId, eventId, "going", SWEPT_AT);
    await setUserResponse(other, eventId, "dismissed", SWEPT_AT);

    const rows = await getDataSource().query(
      "SELECT user_id, response FROM user_live_event_state ORDER BY user_id"
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].response).toBe("going");
    expect(rows[1].response).toBe("dismissed");
  });

  it("cascades away with the user", async () => {
    await setUserResponse(userId, eventId, "going", SWEPT_AT);
    await getDataSource().query("DELETE FROM users WHERE id = ?", [userId]);
    expect(
      await getDataSource().query("SELECT * FROM user_live_event_state")
    ).toEqual([]);
  });

  it("cascades away with the event, along with its performers", async () => {
    await setUserResponse(userId, eventId, "going", SWEPT_AT);
    await getDataSource().query("DELETE FROM live_events WHERE id = ?", [
      eventId,
    ]);
    expect(
      await getDataSource().query("SELECT * FROM user_live_event_state")
    ).toEqual([]);
    expect(
      await getDataSource().query("SELECT * FROM live_event_performers")
    ).toEqual([]);
  });
});

describe("JamBase artist resolution", () => {
  let userId: number;

  beforeEach(async () => {
    userId = await createUser("lasse");
  });

  it("lists artists that have never been resolved", async () => {
    await follow(userId, "mbid-a", "A", null);
    await follow(userId, "mbid-b", "B", "jambase:2");

    expect(await findUnresolvedFollowedArtists(10)).toEqual([
      { artist_mbid: "mbid-a", artist_name: "A" },
    ]);
  });

  it("lists an artist once however many users follow them", async () => {
    const other = await createUser("someone-else");
    await follow(userId, "mbid-a", "A", null);
    await follow(other, "mbid-a", "A", null);

    expect(await findUnresolvedFollowedArtists(10)).toHaveLength(1);
  });

  it("does not list a second follower's artist once anyone resolved it", async () => {
    const other = await createUser("someone-else");
    await follow(userId, "mbid-a", "A", "jambase:1");
    await follow(other, "mbid-a", "A", null);

    expect(await findUnresolvedFollowedArtists(10)).toEqual([]);
  });

  it("excludes a confirmed miss so it is not retried every sweep", async () => {
    await follow(userId, "mbid-a", "A", null);
    await recordArtistResolution("mbid-a", null, SWEPT_AT);

    expect(await findUnresolvedFollowedArtists(10)).toEqual([]);
  });

  it("puts the longest-waiting artist first", async () => {
    await follow(userId, "mbid-b", "B", null);
    await follow(userId, "mbid-a", "A", null);
    await getDataSource().query(
      "UPDATE followed_artists SET created_at = '2026-01-01' WHERE artist_mbid = 'mbid-b'"
    );
    await getDataSource().query(
      "UPDATE followed_artists SET created_at = '2026-02-01' WHERE artist_mbid = 'mbid-a'"
    );

    const unresolved = await findUnresolvedFollowedArtists(10);
    expect(unresolved.map((a) => a.artist_mbid)).toEqual(["mbid-b", "mbid-a"]);
  });

  it("records one row per artist and overwrites it on a later answer", async () => {
    await recordArtistResolution("mbid-a", null, "2026-01-01T00:00:00.000Z");
    await recordArtistResolution("mbid-a", "jambase:42", SWEPT_AT);

    const rows = (await getDataSource().query(
      "SELECT artist_mbid, jambase_artist_id, resolved_at FROM live_artists"
    )) as unknown[];
    expect(rows).toEqual([
      {
        artist_mbid: "mbid-a",
        jambase_artist_id: "jambase:42",
        resolved_at: SWEPT_AT,
      },
    ]);
  });

  it("respects the limit", async () => {
    await follow(userId, "mbid-a", "A", null);
    await follow(userId, "mbid-b", "B", null);
    expect(await findUnresolvedFollowedArtists(1)).toHaveLength(1);
  });

  it("deduplicates jambase ids across users", async () => {
    const other = await createUser("someone-else");
    await follow(userId, "mbid-a", "A", "jambase:1");
    await follow(other, "mbid-a", "A", "jambase:1");
    await follow(other, "mbid-b", "B", "jambase:2");
    await follow(other, "mbid-c", "C", null);

    expect((await listFollowedJambaseIds()).sort()).toEqual([
      "jambase:1",
      "jambase:2",
    ]);
  });

  it("stops sweeping an artist nobody follows any more, but keeps the answer", async () => {
    await recordArtistResolution("mbid-gone", "jambase:9", SWEPT_AT);

    expect(await listFollowedJambaseIds()).toEqual([]);
    expect(await findUnresolvedFollowedArtists(10)).toEqual([]);

    await follow(userId, "mbid-gone", "Gone", null);
    expect(await listFollowedJambaseIds()).toEqual(["jambase:9"]);
    expect(await findUnresolvedFollowedArtists(10)).toEqual([]);
  });

  it("lists users who follow at least one resolved artist", async () => {
    const other = await createUser("someone-else");
    await follow(userId, "mbid-a", "A", "jambase:1");
    await follow(other, "mbid-b", "B", null);

    expect(await listUsersWithResolvedFollows()).toEqual([userId]);
  });
});

describe("collapsed artist resolution", () => {
  let userId: number;
  let other: number;

  beforeEach(async () => {
    userId = await createUser("lasse");
    other = await createUser("someone-else");
  });

  it("reports no follows for an artist nobody follows", async () => {
    expect(await findArtistResolution("mbid-nobody")).toEqual({
      follows: 0,
      jambase_artist_id: null,
      jambase_resolved_at: null,
    });
  });

  it("counts every follow of the same artist as one artist", async () => {
    await follow(userId, "mbid-a", "A", "jambase:1");
    await follow(other, "mbid-a", "A", "jambase:1");

    const summary = await findArtistResolution("mbid-a");
    expect(summary.follows).toBe(2);
    expect(summary.jambase_artist_id).toBe("jambase:1");
  });

  it("reports a confirmed miss with its timestamp", async () => {
    await follow(userId, "mbid-a", "A", null);
    await recordArtistResolution("mbid-a", null, SWEPT_AT);
    await follow(other, "mbid-a", "A", null);

    const summary = await findArtistResolution("mbid-a");
    expect(summary.jambase_artist_id).toBeNull();
    expect(summary.jambase_resolved_at).toBe(SWEPT_AT);
  });

  it("lists one row per distinct artist rather than per follow", async () => {
    await follow(userId, "mbid-a", "A", "jambase:1");
    await follow(other, "mbid-a", "A", "jambase:1");
    await follow(other, "mbid-b", "B", null);

    const resolutions = await listArtistResolutions();
    expect(resolutions).toHaveLength(2);
    expect(resolutions.map((r) => r.follows).sort()).toEqual([1, 2]);
  });
});

describe("user live preferences", () => {
  let userId: number;

  beforeEach(async () => {
    userId = await createUser("lasse");
  });

  it("starts with no location", async () => {
    expect(await getUserLivePreferences(userId)).toEqual({
      live_lat: null,
      live_lon: null,
      live_place: null,
    });
  });

  it("round-trips a location and the place it came from", async () => {
    await setUserLivePreferences(userId, {
      live_lat: MALMO.lat,
      live_lon: MALMO.lon,
      live_place: "Malmö, Skåne, Sweden",
    });

    expect(await getUserLivePreferences(userId)).toEqual({
      live_lat: MALMO.lat,
      live_lon: MALMO.lon,
      live_place: "Malmö, Skåne, Sweden",
    });
  });

  it("returns null for an unknown user", async () => {
    expect(await getUserLivePreferences(9999)).toBeNull();
  });
});

describe("findJambaseIdForArtistMbid", () => {
  it("bridges an MBID to the JamBase id somebody already resolved", async () => {
    const userId = await createUser("lasse");
    await follow(userId, "mbid-yves", "Yves Tumor", "jambase:1");

    expect(await findJambaseIdForArtistMbid("mbid-yves")).toBe("jambase:1");
  });

  it("returns null for an artist nobody follows", async () => {
    expect(await findJambaseIdForArtistMbid("mbid-nobody")).toBeNull();
  });

  it("ignores a follow that has not been resolved yet", async () => {
    const userId = await createUser("lasse");
    await follow(userId, "mbid-yves", "Yves Tumor", null);

    expect(await findJambaseIdForArtistMbid("mbid-yves")).toBeNull();
  });

  it("returns null once nobody follows the artist, since their dates are no longer swept", async () => {
    await recordArtistResolution("mbid-yves", "jambase:1", SWEPT_AT);

    expect(await findJambaseIdForArtistMbid("mbid-yves")).toBeNull();
  });

  it("finds it through any user's follow, not just the caller's", async () => {
    const other = await createUser("someone-else");
    await follow(other, "mbid-yves", "Yves Tumor", "jambase:1");

    expect(await findJambaseIdForArtistMbid("mbid-yves")).toBe("jambase:1");
  });
});
