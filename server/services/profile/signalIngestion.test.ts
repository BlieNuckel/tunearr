import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetRatedItems = vi.fn();
const mockGetAllArtistPlayCounts = vi.fn();

vi.mock("../../api/plex/ratings", () => ({
  getRatedItems: (...args: unknown[]) => mockGetRatedItems(...args),
}));
vi.mock("../../api/plex/artistPlayCounts", () => ({
  getAllArtistPlayCounts: (...args: unknown[]) =>
    mockGetAllArtistPlayCounts(...args),
}));

import {
  latestRatings,
  diffRatings,
  playsDue,
  ingestUserRatings,
  ingestUserPlays,
  type PlexRatingPayload,
  type PlexPlaysPayload,
} from "./signalIngestion";
import { initializeDatabase, closeDatabase, getDataSource } from "../../db";
import { getSignalEvents } from "../../db/userProfile";
import type { UserSignalEvent } from "../../db/entity/UserSignalEvent";

function ratingEvent(
  payload: PlexRatingPayload,
  recordedAt = "2026-01-01T00:00:00.000Z"
): UserSignalEvent {
  return {
    id: 0,
    user_id: 1,
    kind: "plex_rating",
    payload: JSON.stringify(payload),
    recorded_at: recordedAt,
  } as UserSignalEvent;
}

const ratedTrack = {
  ratingKey: "451",
  kind: "track" as const,
  title: "Air",
  artist: "Andromedik",
  rating: 10,
};

describe("latestRatings", () => {
  it("replays the log so a later write wins", () => {
    const map = latestRatings([
      ratingEvent({ ...ratedTrack, rating: 6 }, "2026-01-01T00:00:00.000Z"),
      ratingEvent({ ...ratedTrack, rating: 8 }, "2026-02-01T00:00:00.000Z"),
    ]);
    expect(map.get("451")?.rating).toBe(8);
  });

  it("skips corrupt rows", () => {
    const corrupt = { ...ratingEvent(ratedTrack), payload: "not json" };
    const map = latestRatings([corrupt as UserSignalEvent]);
    expect(map.size).toBe(0);
  });
});

describe("diffRatings", () => {
  it("emits new and changed ratings, skips unchanged", () => {
    const previous = new Map<string, PlexRatingPayload>([
      ["451", { ...ratedTrack, rating: 10 }],
      [
        "999",
        { ratingKey: "999", kind: "album", title: "X", artist: "Y", rating: 4 },
      ],
    ]);
    const current = [
      { ...ratedTrack, rating: 10 }, // unchanged → skip
      {
        ratingKey: "999",
        kind: "album" as const,
        title: "X",
        artist: "Y",
        rating: 6,
      }, // changed
      {
        ratingKey: "1577",
        kind: "track" as const,
        title: "New",
        artist: "Z",
        rating: 8,
      }, // new
    ];
    const changes = diffRatings(previous, current);
    expect(changes.map((c) => c.ratingKey).sort()).toEqual(["1577", "999"]);
    expect(changes.find((c) => c.ratingKey === "999")?.rating).toBe(6);
  });

  it("does not emit a clear for an item dropping out of the rated set", () => {
    const previous = new Map<string, PlexRatingPayload>([
      ["451", { ...ratedTrack, rating: 10 }],
    ]);
    expect(diffRatings(previous, [])).toEqual([]);
  });
});

describe("playsDue", () => {
  const now = Date.parse("2026-06-28T12:00:00.000Z");
  const day = 24 * 60 * 60 * 1000;

  it("is due when no plays capture exists", () => {
    expect(playsDue([], now, day)).toBe(true);
  });

  it("is not due when the last plays capture is within the interval", () => {
    const recent = {
      recorded_at: "2026-06-28T06:00:00.000Z",
    } as UserSignalEvent;
    expect(playsDue([recent], now, day)).toBe(false);
  });

  it("is due when the last plays capture is older than the interval", () => {
    const old = { recorded_at: "2026-06-26T06:00:00.000Z" } as UserSignalEvent;
    expect(playsDue([old], now, day)).toBe(true);
  });
});

describe("ingestion (with DB)", () => {
  beforeEach(async () => {
    await initializeDatabase(":memory:");
    await getDataSource().query("INSERT INTO users (username) VALUES (?)", [
      "alice",
    ]);
  });
  afterEach(async () => {
    await closeDatabase();
  });

  it("writes all ratings on first run, then nothing on an unchanged re-run", async () => {
    mockGetRatedItems.mockResolvedValue([ratedTrack]);

    expect(await ingestUserRatings(1, "tok")).toBe(1);
    expect(await ingestUserRatings(1, "tok")).toBe(0);

    const events = await getSignalEvents(1, "plex_rating");
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].payload).artist).toBe("Andromedik");
  });

  it("appends one event when an existing rating changes", async () => {
    mockGetRatedItems.mockResolvedValueOnce([ratedTrack]);
    await ingestUserRatings(1, "tok");
    mockGetRatedItems.mockResolvedValueOnce([{ ...ratedTrack, rating: 4 }]);

    expect(await ingestUserRatings(1, "tok")).toBe(1);
    const events = await getSignalEvents(1, "plex_rating");
    expect(events).toHaveLength(2);
    expect(JSON.parse(events[1].payload).rating).toBe(4);
  });

  it("writes a plays capture of per-artist play counts for all played artists", async () => {
    mockGetAllArtistPlayCounts.mockResolvedValue([
      { name: "Andromedik", viewCount: 120 },
      { name: "Durry", viewCount: 30 },
    ]);

    await ingestUserPlays(1, "tok");

    const events = await getSignalEvents(1, "plex_plays");
    expect(events).toHaveLength(1);
    const payload = JSON.parse(events[0].payload) as PlexPlaysPayload;
    expect(payload.artists).toEqual([
      { name: "Andromedik", playCount: 120 },
      { name: "Durry", playCount: 30 },
    ]);
    expect(mockGetAllArtistPlayCounts).toHaveBeenCalledWith("tok");
  });
});
