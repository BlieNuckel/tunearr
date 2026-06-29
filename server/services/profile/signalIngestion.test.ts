import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetRatedItems = vi.fn();
const mockGetItemRating = vi.fn();
const mockGetAllArtistPlayCounts = vi.fn();

vi.mock("../../api/plex/ratings", () => ({
  getRatedItems: (...args: unknown[]) => mockGetRatedItems(...args),
  getItemRating: (...args: unknown[]) => mockGetItemRating(...args),
}));
vi.mock("../../api/plex/artistPlayCounts", () => ({
  getAllArtistPlayCounts: (...args: unknown[]) =>
    mockGetAllArtistPlayCounts(...args),
}));

import {
  latestRatings,
  diffRatings,
  detectUnratings,
  playsDue,
  reconstructPlayCounts,
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

const ratedAlbum = {
  ratingKey: "999",
  kind: "album" as const,
  title: "Reflections",
  artist: "Durry",
  rating: 8,
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

function playsEvent(
  artists: { name: string; playCount: number }[],
  recordedAt: string
): UserSignalEvent {
  return {
    id: 0,
    user_id: 1,
    kind: "plex_plays",
    payload: JSON.stringify({ artists }),
    recorded_at: recordedAt,
  } as UserSignalEvent;
}

describe("reconstructPlayCounts", () => {
  it("folds deltas last-write-wins and carries unchanged artists forward", () => {
    const events = [
      playsEvent(
        [
          { name: "A", playCount: 10 },
          { name: "B", playCount: 5 },
        ],
        "2026-01-01T00:00:00.000Z"
      ),
      playsEvent([{ name: "A", playCount: 30 }], "2026-02-01T00:00:00.000Z"),
    ];
    const counts = reconstructPlayCounts(events, Infinity);
    expect(counts.get("A")).toBe(30);
    expect(counts.get("B")).toBe(5);
  });

  it("ignores events recorded after the cutoff", () => {
    const events = [
      playsEvent([{ name: "A", playCount: 10 }], "2026-01-01T00:00:00.000Z"),
      playsEvent([{ name: "A", playCount: 30 }], "2026-03-01T00:00:00.000Z"),
    ];
    const counts = reconstructPlayCounts(
      events,
      Date.parse("2026-02-01T00:00:00.000Z")
    );
    expect(counts.get("A")).toBe(10);
  });

  it("skips corrupt rows", () => {
    const events = [
      { ...playsEvent([], "2026-01-01T00:00:00.000Z"), payload: "not json" },
      playsEvent([{ name: "A", playCount: 7 }], "2026-02-01T00:00:00.000Z"),
    ];
    const counts = reconstructPlayCounts(events as UserSignalEvent[], Infinity);
    expect(counts.get("A")).toBe(7);
    expect(counts.size).toBe(1);
  });
});

describe("detectUnratings", () => {
  it("finds previously-rated keys absent from the current set", () => {
    const previous = new Map<string, PlexRatingPayload>([
      ["451", { ...ratedTrack, rating: 10 }],
      [
        "999",
        { ratingKey: "999", kind: "album", title: "X", artist: "Y", rating: 4 },
      ],
    ]);
    const current = [{ ...ratedTrack, rating: 10 }];
    expect(detectUnratings(previous, current)).toEqual(["999"]);
  });

  it("ignores keys already cleared (rating 0)", () => {
    const previous = new Map<string, PlexRatingPayload>([
      ["451", { ...ratedTrack, rating: 0 }],
    ]);
    expect(detectUnratings(previous, [])).toEqual([]);
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

  it("writes a delta of only the artists whose count increased", async () => {
    mockGetAllArtistPlayCounts.mockReset();
    mockGetAllArtistPlayCounts.mockResolvedValueOnce([
      { name: "A", viewCount: 10 },
      { name: "B", viewCount: 5 },
    ]);
    await ingestUserPlays(1, "tok");
    mockGetAllArtistPlayCounts.mockResolvedValueOnce([
      { name: "A", viewCount: 30 },
      { name: "B", viewCount: 5 },
    ]);
    await ingestUserPlays(1, "tok");

    const events = await getSignalEvents(1, "plex_plays");
    expect(events).toHaveLength(2);
    expect((JSON.parse(events[1].payload) as PlexPlaysPayload).artists).toEqual(
      [{ name: "A", playCount: 30 }]
    );
  });

  it("writes nothing when no count increased", async () => {
    mockGetAllArtistPlayCounts.mockReset();
    mockGetAllArtistPlayCounts.mockResolvedValue([
      { name: "A", viewCount: 10 },
    ]);

    await ingestUserPlays(1, "tok");
    await ingestUserPlays(1, "tok");

    expect(await getSignalEvents(1, "plex_plays")).toHaveLength(1);
  });

  it("never records a decrease or a vanished artist (monotonic)", async () => {
    mockGetAllArtistPlayCounts.mockReset();
    mockGetAllArtistPlayCounts.mockResolvedValueOnce([
      { name: "A", viewCount: 10 },
      { name: "B", viewCount: 5 },
    ]);
    await ingestUserPlays(1, "tok");
    mockGetAllArtistPlayCounts.mockResolvedValueOnce([
      { name: "A", viewCount: 8 },
    ]);
    await ingestUserPlays(1, "tok");

    expect(await getSignalEvents(1, "plex_plays")).toHaveLength(1);
  });

  it("treats a transient-empty read as a no-op", async () => {
    mockGetAllArtistPlayCounts.mockReset();
    mockGetAllArtistPlayCounts.mockResolvedValueOnce([
      { name: "A", viewCount: 10 },
    ]);
    await ingestUserPlays(1, "tok");
    mockGetAllArtistPlayCounts.mockResolvedValueOnce([]);
    await ingestUserPlays(1, "tok");

    expect(await getSignalEvents(1, "plex_plays")).toHaveLength(1);
  });

  it("records a confirmed un-rating as a rating-0 event", async () => {
    mockGetRatedItems.mockReset();
    mockGetItemRating.mockReset();
    mockGetRatedItems.mockResolvedValueOnce([ratedTrack, ratedAlbum]);
    await ingestUserRatings(1, "tok");
    mockGetRatedItems.mockResolvedValueOnce([ratedAlbum]);
    mockGetItemRating.mockResolvedValueOnce(null);

    expect(await ingestUserRatings(1, "tok")).toBe(1);

    const events = await getSignalEvents(1, "plex_rating");
    expect(events).toHaveLength(3);
    const last = JSON.parse(events[2].payload) as PlexRatingPayload;
    expect(last).toMatchObject({ ratingKey: "451", rating: 0 });
    expect(mockGetItemRating).toHaveBeenCalledWith("tok", "451");
  });

  it("does not record an un-rating when Plex still reports a rating", async () => {
    mockGetRatedItems.mockReset();
    mockGetItemRating.mockReset();
    mockGetRatedItems.mockResolvedValueOnce([ratedTrack, ratedAlbum]);
    await ingestUserRatings(1, "tok");
    mockGetRatedItems.mockResolvedValueOnce([ratedAlbum]);
    mockGetItemRating.mockResolvedValueOnce(10);

    expect(await ingestUserRatings(1, "tok")).toBe(0);
    expect(await getSignalEvents(1, "plex_rating")).toHaveLength(2);
  });

  it("skips un-rating detection when an implausible number disappear", async () => {
    mockGetRatedItems.mockReset();
    mockGetItemRating.mockReset();
    const many = Array.from({ length: 52 }, (_, i) => ({
      ratingKey: `k${i}`,
      kind: "track" as const,
      title: `t${i}`,
      artist: "Z",
      rating: 8,
    }));
    mockGetRatedItems.mockResolvedValueOnce(many);
    await ingestUserRatings(1, "tok");
    mockGetRatedItems.mockResolvedValueOnce([many[0]]);

    expect(await ingestUserRatings(1, "tok")).toBe(0);
    expect(await getSignalEvents(1, "plex_rating")).toHaveLength(52);
    expect(mockGetItemRating).not.toHaveBeenCalled();
  });

  it("does not detect un-ratings from an empty response", async () => {
    mockGetRatedItems.mockReset();
    mockGetItemRating.mockReset();
    mockGetRatedItems.mockResolvedValueOnce([ratedTrack]);
    await ingestUserRatings(1, "tok");
    mockGetRatedItems.mockResolvedValueOnce([]);

    expect(await ingestUserRatings(1, "tok")).toBe(0);
    expect(await getSignalEvents(1, "plex_rating")).toHaveLength(1);
    expect(mockGetItemRating).not.toHaveBeenCalled();
  });
});
