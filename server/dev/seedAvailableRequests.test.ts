import { describe, it, expect } from "vitest";
import {
  SEED_AVAILABLE_REQUESTS,
  seedAvailableRequestRow,
} from "./seedAvailableRequests";
import {
  MAX_REQUEST_HIGHLIGHTS,
  REQUEST_HIGHLIGHT_DAYS,
} from "../services/highlights/requests";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");

const inWindow = (r: (typeof SEED_AVAILABLE_REQUESTS)[number]) =>
  r.arrivedHoursAgo < REQUEST_HIGHLIGHT_DAYS * 24;

describe("seed available requests shape", () => {
  it("uses one album per request, since the seed upserts by album", () => {
    const mbids = SEED_AVAILABLE_REQUESTS.map((r) => r.albumMbid);
    expect(new Set(mbids).size).toBe(mbids.length);
  });
});

describe("state coverage", () => {
  it("shows as many arrived requests as Home has room for", () => {
    expect(
      SEED_AVAILABLE_REQUESTS.filter((r) => inWindow(r) && !r.dismissed)
    ).toHaveLength(MAX_REQUEST_HIGHLIGHTS);
  });

  it("seeds one dismissed and one aged-out request", () => {
    expect(
      SEED_AVAILABLE_REQUESTS.filter((r) => inWindow(r) && r.dismissed)
    ).toHaveLength(1);
    expect(SEED_AVAILABLE_REQUESTS.filter((r) => !inWindow(r))).toHaveLength(1);
  });
});

describe("seedAvailableRequestRow", () => {
  it("stores an imported request dated relative to the run", () => {
    const row = seedAvailableRequestRow(SEED_AVAILABLE_REQUESTS[0], 4, NOW);

    expect(row).toMatchObject({
      user_id: 4,
      album_mbid: "48140466-cff6-3222-bd55-63c27e43190d",
      status: "approved",
      lidarr_status: "imported",
      available_at: "2026-11-18T10:00:00.000Z",
      highlight_dismissed_at: null,
    });
  });

  it("marks a dismissed seed as dismissed", () => {
    const seed = SEED_AVAILABLE_REQUESTS.find((r) => r.dismissed)!;
    const row = seedAvailableRequestRow(seed, 4, NOW);

    expect(row.highlight_dismissed_at).toBe(row.available_at);
  });
});
