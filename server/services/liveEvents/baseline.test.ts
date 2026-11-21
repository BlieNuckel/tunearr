import { describe, it, expect } from "vitest";
import type { UserLiveArtistState } from "../../db/index";
import type { HydratedLiveEvent } from "../../db/liveEvents";
import { decideBaseline, snapshotOf } from "./baseline";
import type { ArtistTour, Origin } from "./tours";

const HOME: Origin = { lat: 55.6, lon: 13.0 };

function date(id: number): HydratedLiveEvent {
  return {
    id,
    event_date: `2026-12-${String(id).padStart(2, "0")}`,
  } as HydratedLiveEvent;
}

function tour(
  closestId: number | null,
  distanceKm: number | null,
  dateIds: number[] = closestId === null ? [] : [closestId]
): ArtistTour {
  const dates = dateIds.map(date);
  return {
    artistMbid: "mbid-a",
    artistName: "A",
    jambaseArtistId: "jambase:a",
    dates,
    closest: dates.find((d) => d.id === closestId) ?? null,
    distanceKm,
  };
}

function state(
  closestId: number | null,
  distanceKm: number | null,
  origin: Origin | null = HOME
): UserLiveArtistState {
  return {
    id: 1,
    user_id: 1,
    artist_mbid: "mbid-a",
    closest_event_id: closestId,
    closest_distance_km: distanceKm,
    origin_lat: origin?.lat ?? null,
    origin_lon: origin?.lon ?? null,
    evaluated_at: "2026-11-01T00:00:00.000Z",
    notified_at: null,
    dismissed_at: null,
  } as UserLiveArtistState;
}

describe("decideBaseline", () => {
  it("records silently the first time an artist is checked, dates or not", () => {
    expect(decideBaseline(tour(1, 50), undefined, HOME)).toBe("record");
    expect(decideBaseline(tour(null, null), undefined, HOME)).toBe("record");
  });

  it("notifies when an artist with no dates announces some", () => {
    expect(decideBaseline(tour(1, 400), state(null, null), HOME)).toBe(
      "notify"
    );
  });

  it("notifies for first dates even without a location to measure from", () => {
    expect(decideBaseline(tour(1, null), state(null, null, null), null)).toBe(
      "notify"
    );
  });

  it("notifies for a closer date, by any margin", () => {
    expect(decideBaseline(tour(2, 99.9, [1, 2]), state(1, 100), HOME)).toBe(
      "notify"
    );
  });

  it("stays quiet about a date that is not closer", () => {
    expect(decideBaseline(tour(1, 100, [1, 2]), state(1, 100), HOME)).toBe(
      "keep"
    );
  });

  it("re-records silently when the user moved", () => {
    const moved = { lat: 48.8, lon: 2.3 };
    expect(decideBaseline(tour(2, 5, [1, 2]), state(1, 100), moved)).toBe(
      "record"
    );
  });

  it("re-records silently when the user first sets a location", () => {
    expect(decideBaseline(tour(1, 40), state(1, null, null), HOME)).toBe(
      "record"
    );
  });

  it("re-records silently when the known closest date passed or was cancelled", () => {
    expect(decideBaseline(tour(2, 300, [2]), state(1, 100), HOME)).toBe(
      "record"
    );
  });

  it("re-records silently when every date is gone", () => {
    expect(decideBaseline(tour(null, null), state(1, 100), HOME)).toBe(
      "record"
    );
  });

  it("keeps a known 'no dates' as it is", () => {
    expect(decideBaseline(tour(null, null), state(null, null), HOME)).toBe(
      "keep"
    );
  });

  it("does not call a measured date closer than one that had no coordinates", () => {
    expect(decideBaseline(tour(2, 10, [1, 2]), state(1, null), HOME)).toBe(
      "keep"
    );
  });

  it("never finds a closer date without a location", () => {
    expect(
      decideBaseline(tour(1, null, [1, 2]), state(1, null, null), null)
    ).toBe("keep");
  });
});

describe("snapshotOf", () => {
  it("captures the closest date, its distance and where it was measured from", () => {
    expect(snapshotOf(tour(3, 42), HOME, "2026-11-20T00:00:00.000Z")).toEqual({
      closest_event_id: 3,
      closest_distance_km: 42,
      origin_lat: HOME.lat,
      origin_lon: HOME.lon,
      evaluated_at: "2026-11-20T00:00:00.000Z",
    });
  });

  it("records 'checked, no dates' as a null closest date", () => {
    expect(snapshotOf(tour(null, null), null, "t")).toMatchObject({
      closest_event_id: null,
      origin_lat: null,
    });
  });
});
