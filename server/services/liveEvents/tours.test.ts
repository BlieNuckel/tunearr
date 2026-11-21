import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase } from "../../db/index";
import type { HydratedLiveEvent } from "../../db/liveEvents";
import { pickClosest, listTouringArtists, listUserTours } from "./tours";
import {
  BERLIN,
  COPENHAGEN,
  LYON,
  MALMO,
  NOW,
  createUser,
  follow,
  locate,
  sweep,
} from "./__fixtures__/tours";

function at(
  id: number,
  date: string,
  coords: { lat: number; lon: number } | null
): HydratedLiveEvent {
  return {
    id,
    event_date: date,
    venue_lat: coords?.lat ?? null,
    venue_lon: coords?.lon ?? null,
  } as HydratedLiveEvent;
}

describe("pickClosest", () => {
  const dates = [
    at(1, "2026-12-01", BERLIN),
    at(2, "2026-12-05", COPENHAGEN),
    at(3, "2026-12-09", null),
  ];

  it("leads with the date nearest the user", () => {
    const closest = pickClosest(dates, MALMO);
    expect(closest?.event.id).toBe(2);
    expect(closest?.distanceKm).toBeGreaterThan(20);
    expect(closest?.distanceKm).toBeLessThan(40);
  });

  it("skips a venue without coordinates rather than guessing", () => {
    expect(
      pickClosest(
        [at(1, "2026-12-01", null), at(2, "2026-12-05", BERLIN)],
        MALMO
      )?.event.id
    ).toBe(2);
  });

  it("falls back to the soonest date without a location", () => {
    expect(pickClosest(dates, null)).toEqual({
      event: dates[0],
      distanceKm: null,
    });
  });

  it("falls back to the soonest date when no venue can be measured", () => {
    const unmeasured = [at(4, "2026-12-01", null), at(5, "2026-12-02", null)];
    expect(pickClosest(unmeasured, MALMO)?.event.id).toBe(4);
  });

  it("has nothing to lead with when there are no dates", () => {
    expect(pickClosest([], MALMO)).toBeNull();
  });
});

describe("listUserTours", () => {
  let userId: number;

  beforeEach(async () => {
    await initializeDatabase(":memory:");
    userId = await createUser("lasse");
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it("groups each followed artist's upcoming dates, leading with the closest", async () => {
    await follow(userId, "a");
    await follow(userId, "b");
    await locate(userId, MALMO);
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10", at: BERLIN },
      { key: "a2", artist: "a", date: "2027-01-10", at: COPENHAGEN },
      { key: "z1", artist: "z", date: "2026-12-10" },
    ]);

    const { origin, tours } = await listUserTours(userId, NOW);

    expect(origin).toEqual(MALMO);
    const a = tours.find((t) => t.artistName === "a");
    expect(a?.dates.map((d) => d.event_key)).toEqual(["a1", "a2"]);
    expect(a?.closest?.event_key).toBe("a2");
    expect(tours.find((t) => t.artistName === "b")).toMatchObject({
      dates: [],
      closest: null,
    });
    expect(tours.map((t) => t.artistName)).not.toContain("z");
  });

  it("leaves out cancelled and past dates", async () => {
    await follow(userId, "a");
    await sweep([
      { key: "past", artist: "a", date: "2026-11-01" },
      { key: "off", artist: "a", date: "2026-12-01", status: "cancelled" },
      { key: "on", artist: "a", date: "2026-12-02" },
    ]);

    const { tours, events } = await listUserTours(userId, NOW);

    expect(tours[0].dates.map((d) => d.event_key)).toEqual(["on"]);
    expect(events.map((e) => e.event_key).sort()).toEqual(["off", "on"]);
  });

  it("has no origin when neither the user nor the instance has a location", async () => {
    await follow(userId, "a");
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10" }]);

    const { origin, tours } = await listUserTours(userId, NOW);

    expect(origin).toBeNull();
    expect(tours[0].distanceKm).toBeNull();
  });
});

describe("listTouringArtists", () => {
  let userId: number;

  beforeEach(async () => {
    await initializeDatabase(":memory:");
    userId = await createUser("lasse");
    for (const artist of ["far", "near", "unmeasured", "quiet"]) {
      await follow(userId, artist);
    }
    await sweep([
      { key: "far1", artist: "far", date: "2026-12-01", at: LYON },
      { key: "near1", artist: "near", date: "2027-02-01", at: BERLIN },
      { key: "near2", artist: "near", date: "2027-03-01", at: COPENHAGEN },
      {
        key: "unmeasured1",
        artist: "unmeasured",
        date: "2026-11-25",
        at: null,
      },
    ]);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it("lists touring artists nearest first, unmeasured last", async () => {
    await locate(userId, MALMO);

    const { hasLocation, tours } = await listTouringArtists(userId, NOW);

    expect(hasLocation).toBe(true);
    expect(tours.map((t) => t.artistName)).toEqual([
      "near",
      "far",
      "unmeasured",
    ]);
    expect(tours[0].closest.event_key).toBe("near2");
  });

  it("lists by the soonest date without a location", async () => {
    const { hasLocation, tours } = await listTouringArtists(userId, NOW);

    expect(hasLocation).toBe(false);
    expect(tours.map((t) => t.closest.event_key)).toEqual([
      "unmeasured1",
      "far1",
      "near1",
    ]);
  });
});
