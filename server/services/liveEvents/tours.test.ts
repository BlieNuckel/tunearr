import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase } from "../../db/index";
import type { HydratedLiveEvent } from "../../db/liveEvents";
import { pickClosest, listUserTours } from "./tours";
import {
  BERLIN,
  COPENHAGEN,
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
