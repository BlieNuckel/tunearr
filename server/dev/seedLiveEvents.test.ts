import { describe, it, expect } from "vitest";
import {
  SCENARIO_LIVE_EVENTS,
  SEED_LIVE_EVENTS,
  SEED_FOLLOWED_ARTISTS,
} from "./seedLiveEvents";
import { distanceKm } from "../db/liveEvents";

const KEYS = SEED_LIVE_EVENTS.map((event) => event.key);
const FOLLOWED_IDS = new Set(
  SEED_FOLLOWED_ARTISTS.map((artist) => artist.jambaseId)
);

function find(predicate: (e: (typeof SEED_LIVE_EVENTS)[number]) => boolean) {
  return SEED_LIVE_EVENTS.filter(predicate);
}

describe("seed data shape", () => {
  it("uses unique event keys", () => {
    expect(new Set(KEYS).size).toBe(KEYS.length);
  });

  it("uses real MusicBrainz ids so artist pages resolve", () => {
    for (const artist of SEED_FOLLOWED_ARTISTS) {
      expect(artist.mbid).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it("gives every event a headliner to lead the copy with", () => {
    for (const event of SEED_LIVE_EVENTS) {
      expect(event.performers.some((p) => p.isHeadliner)).toBe(true);
    }
  });
});

describe("state coverage", () => {
  it("covers an artist whose dates were all cancelled, so their first new date is news", () => {
    const upcoming = (artist: string) =>
      find(
        (e) =>
          e.dayOffset > 0 &&
          e.status !== "cancelled" &&
          e.performers.some((p) => p.jambaseId === artist)
      );
    const cancelledOnly = SEED_FOLLOWED_ARTISTS.filter(
      (artist) =>
        upcoming(artist.jambaseId).length === 0 &&
        find((e) =>
          e.performers.some((p) => p.jambaseId === artist.jambaseId)
        ).some((e) => e.status === "cancelled")
    );
    expect(cancelledOnly).not.toHaveLength(0);
  });

  it("covers an artist with several upcoming dates to pick the closest from", () => {
    const counts = new Map<string, number>();
    for (const event of find(
      (e) => e.dayOffset > 0 && e.status !== "cancelled"
    )) {
      const lead = event.performers.find((p) => p.isHeadliner)!.jambaseId;
      counts.set(lead, (counts.get(lead) ?? 0) + 1);
    }
    expect([...counts.values()].some((count) => count > 1)).toBe(true);
  });

  it("covers a recent change to a show the user is going to", () => {
    expect(
      find(
        (e) =>
          e.adminResponse === "going" &&
          e.status !== "scheduled" &&
          (e.statusChangedDaysAgo ?? 99) < 14
      )
    ).not.toHaveLength(0);
  });

  it("covers an old change nobody is going to, which stays quiet", () => {
    expect(
      find(
        (e) =>
          e.status !== "scheduled" &&
          e.adminResponse !== "going" &&
          (e.statusChangedDaysAgo ?? 0) > 14
      )
    ).not.toHaveLength(0);
  });

  it("covers a venue without coordinates", () => {
    expect(find((e) => e.lat === null || e.lon === null)).not.toHaveLength(0);
  });

  it("covers each non-scheduled status", () => {
    for (const status of ["cancelled", "rescheduled", "postponed"]) {
      expect(find((e) => e.status === status)).not.toHaveLength(0);
    }
  });

  it("pairs a rescheduled show with the date it moved from", () => {
    for (const event of find((e) => e.status === "rescheduled")) {
      expect(event.previousStartDayOffset).toBeDefined();
    }
  });

  it("covers every /library/live tab", () => {
    expect(find((e) => e.adminResponse === "going")).not.toHaveLength(0);
    expect(find((e) => e.adminResponse === "dismissed")).not.toHaveLength(0);
    expect(find((e) => e.dayOffset < 0)).not.toHaveLength(0);
  });

  it("only seeds shows by followed artists, the only ones ever surfaced", () => {
    for (const event of SEED_LIVE_EVENTS) {
      expect(event.performers.some((p) => FOLLOWED_IDS.has(p.jambaseId))).toBe(
        true
      );
    }
  });

  it("covers a show with no ticket link", () => {
    expect(find((e) => e.ticketUrl === null)).not.toHaveLength(0);
  });

  it("covers a multi-artist bill", () => {
    expect(find((e) => e.performers.length > 1)).not.toHaveLength(0);
  });
});

describe("announce scenario", () => {
  const MALMO = { lat: 55.605, lon: 13.0038 };

  function headliner(event: (typeof SEED_LIVE_EVENTS)[number]): string {
    return event.performers.find((p) => p.isHeadliner)!.jambaseId;
  }

  function distance(event: (typeof SEED_LIVE_EVENTS)[number]): number {
    return distanceKm(MALMO.lat, MALMO.lon, event.lat!, event.lon!);
  }

  it("uses keys the seed does not", () => {
    for (const event of SCENARIO_LIVE_EVENTS) {
      expect(KEYS).not.toContain(event.key);
    }
  });

  it("gives an artist with no upcoming dates their first one", () => {
    const [first] = SCENARIO_LIVE_EVENTS;
    const before = find(
      (e) =>
        headliner(e) === headliner(first) &&
        e.dayOffset > 0 &&
        e.status !== "cancelled"
    );
    expect(before).toEqual([]);
  });

  it("gives another artist a date closer than any they had", () => {
    const [, closer] = SCENARIO_LIVE_EVENTS;
    const before = find(
      (e) =>
        headliner(e) === headliner(closer) &&
        e.dayOffset > 0 &&
        e.status !== "cancelled"
    );
    expect(before).not.toHaveLength(0);
    for (const event of before) {
      expect(distance(closer)).toBeLessThan(distance(event));
    }
  });
});
