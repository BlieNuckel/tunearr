import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListAvailable = vi.fn();

vi.mock("../../db/requests", () => ({
  listAvailableRequestsForUser: (...args: unknown[]) =>
    mockListAvailable(...args),
}));

import {
  listRequestHighlights,
  MAX_REQUEST_HIGHLIGHTS,
  REQUEST_HIGHLIGHT_DAYS,
} from "./requests";
import { TIER_FRESH } from "./rank";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");

function row(id: number, availableAt = "2026-11-17T09:00:00.000Z") {
  return {
    id,
    user_id: 7,
    album_mbid: `rg-${id}`,
    album_title: `Album ${id}`,
    artist_name: "Requested Artist",
    status: "approved",
    lidarr_status: "imported",
    available_at: availableAt,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListAvailable.mockResolvedValue([]);
});

describe("listRequestHighlights", () => {
  it("asks for requests that arrived in the last week", async () => {
    await listRequestHighlights(7, NOW);

    expect(REQUEST_HIGHLIGHT_DAYS).toBe(7);
    expect(mockListAvailable).toHaveBeenCalledWith(
      7,
      "2026-11-11T12:00:00.000Z"
    );
  });

  it("ranks an arrived request as fresh news from when it arrived", async () => {
    mockListAvailable.mockResolvedValue([row(3)]);

    const [entry] = await listRequestHighlights(7, NOW);

    expect(entry).toEqual({
      tier: TIER_FRESH,
      at: "2026-11-17T09:00:00.000Z",
      highlight: {
        kind: "request",
        key: "request:3",
        requestId: 3,
        albumMbid: "rg-3",
        title: "Album 3",
        artistName: "Requested Artist",
        coverUrl: "https://coverartarchive.org/release-group/rg-3/front-500",
        availableAt: "2026-11-17T09:00:00.000Z",
      },
    });
  });

  it("keeps only the newest few so a bulk request cannot fill Home", async () => {
    mockListAvailable.mockResolvedValue([row(1), row(2), row(3), row(4)]);

    const entries = await listRequestHighlights(7, NOW);

    expect(MAX_REQUEST_HIGHLIGHTS).toBe(2);
    expect(entries.map((e) => e.highlight.key)).toEqual([
      "request:1",
      "request:2",
    ]);
  });
});
