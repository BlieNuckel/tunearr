import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetRecent = vi.fn();
const mockEnrich = vi.fn();

vi.mock("../followed/followedService", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../followed/followedService")>();
  return {
    ...original,
    getRecentReleasesForUser: (...args: unknown[]) => mockGetRecent(...args),
  };
});

vi.mock("../requests/lidarrEnrichment", () => ({
  enrichRequestsWithLidarr: (...args: unknown[]) => mockEnrich(...args),
}));

import {
  listReleaseHighlights,
  RELEASE_HIGHLIGHT_DAYS,
  withLidarrStatus,
} from "./releases";
import { TIER_FRESH, TIER_STANDING } from "./rank";
import { VARIOUS_ARTISTS_MBID } from "../../utils/artistFilter";
import type { Highlight } from "./types";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    followed_artist_id: 1,
    artist_name: "Followed Artist",
    artist_mbid: "mbid-followed",
    release_key: "album|2026-11",
    album_title: "Followed Album",
    release_date: "2026-11-15",
    release_group_mbid: "rg-1",
    cover_url: "https://caa/rg-1",
    release_type: "Album",
    secondary_types: null,
    viewed_at: null,
    dismissed_at: null,
    notified_at: "2026-11-15T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRecent.mockResolvedValue([]);
  mockEnrich.mockResolvedValue([]);
});

describe("listReleaseHighlights", () => {
  it("asks for the last two weeks of releases", async () => {
    await listReleaseHighlights(7, NOW);

    expect(RELEASE_HIGHLIGHT_DAYS).toBe(14);
    expect(mockGetRecent).toHaveBeenCalledWith(7, {
      from: "2026-11-04",
      to: "2026-11-18",
    });
  });

  it("maps a release to a highlight dated by its release date", async () => {
    mockGetRecent.mockResolvedValue([row()]);

    const [entry] = await listReleaseHighlights(7, NOW);

    expect(entry.at).toBe("2026-11-15");
    expect(entry.highlight).toEqual({
      kind: "release",
      key: "release:1",
      followedReleaseId: 1,
      releaseGroupMbid: "rg-1",
      title: "Followed Album",
      artistName: "Followed Artist",
      artistMbid: "mbid-followed",
      releaseDate: "2026-11-15",
      releaseType: "Album",
      coverUrl: "https://caa/rg-1",
      lidarrStatus: null,
      unseen: true,
    });
  });

  it("ranks an unseen release as fresh and a seen one as standing", async () => {
    mockGetRecent.mockResolvedValue([
      row({ id: 1, release_group_mbid: "rg-1" }),
      row({
        id: 2,
        release_group_mbid: "rg-2",
        viewed_at: "2026-11-16T00:00:00.000Z",
      }),
    ]);

    const result = await listReleaseHighlights(7, NOW);

    expect(result.map((r) => r.tier)).toEqual([TIER_FRESH, TIER_STANDING]);
    expect(result[1].highlight.unseen).toBe(false);
  });

  it("drops release types that are noise", async () => {
    mockGetRecent.mockResolvedValue([
      row({ id: 1, release_group_mbid: "rg-1", release_type: "Broadcast" }),
      row({
        id: 2,
        release_group_mbid: "rg-2",
        secondary_types: JSON.stringify(["Live"]),
      }),
      row({ id: 3, release_group_mbid: "rg-3", release_type: "EP" }),
    ]);

    const result = await listReleaseHighlights(7, NOW);

    expect(result.map((r) => r.highlight.key)).toEqual(["release:3"]);
  });

  it("drops placeholder artists", async () => {
    mockGetRecent.mockResolvedValue([
      row({
        artist_name: "Various Artists",
        artist_mbid: VARIOUS_ARTISTS_MBID,
      }),
    ]);

    expect(await listReleaseHighlights(7, NOW)).toEqual([]);
  });

  it("keeps a collaboration once when followed through two artists", async () => {
    mockGetRecent.mockResolvedValue([
      row({ id: 1, release_group_mbid: "rg-shared" }),
      row({ id: 2, release_group_mbid: "rg-shared", artist_name: "Other" }),
      row({ id: 3, release_group_mbid: null }),
      row({ id: 4, release_group_mbid: null }),
    ]);

    const result = await listReleaseHighlights(7, NOW);

    expect(result.map((r) => r.highlight.key)).toEqual([
      "release:1",
      "release:3",
      "release:4",
    ]);
  });
});

describe("withLidarrStatus", () => {
  function release(key: string, mbid: string | null): Highlight {
    return {
      kind: "release",
      key,
      followedReleaseId: 1,
      releaseGroupMbid: mbid,
      title: key,
      artistName: "Artist",
      artistMbid: "mbid",
      releaseDate: "2026-11-10",
      releaseType: "Album",
      coverUrl: null,
      lidarrStatus: null,
      unseen: true,
    };
  }

  it("adds Lidarr's status to releases with a release group", async () => {
    mockEnrich.mockResolvedValue([{ status: "imported" }, null]);

    const result = await withLidarrStatus([
      release("a", "rg-a"),
      release("b", "rg-b"),
      release("c", null),
    ]);

    expect(mockEnrich).toHaveBeenCalledWith(["rg-a", "rg-b"]);
    expect(
      result.map((h) => (h.kind === "release" ? h.lidarrStatus : undefined))
    ).toEqual(["imported", null, null]);
  });

  it("does not ask Lidarr when there is nothing to look up", async () => {
    const input = [release("a", null)];
    expect(await withLidarrStatus(input)).toBe(input);
    expect(mockEnrich).not.toHaveBeenCalled();
  });
});
