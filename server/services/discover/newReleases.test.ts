import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetFollowedReleases = vi.fn();
const mockEnrich = vi.fn();

vi.mock("../followed/followedService", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../followed/followedService")>();
  return {
    ...original,
    getFollowedReleasesForUser: (...args: unknown[]) =>
      mockGetFollowedReleases(...args),
  };
});

vi.mock("../requests/lidarrEnrichment", () => ({
  enrichRequestsWithLidarr: (...args: unknown[]) => mockEnrich(...args),
}));

import { TARGET_ITEM_COUNT, getNewReleases } from "./newReleases";
import { VARIOUS_ARTISTS_MBID } from "../../utils/artistFilter";

const NOW = Date.parse("2026-07-09T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function followedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    followed_artist_id: 1,
    artist_name: "Followed Artist",
    artist_mbid: "mbid-followed",
    release_key: "album|2026-07",
    album_title: "Followed Album",
    release_date: daysAgo(5),
    release_group_mbid: "rg-followed",
    cover_url: "https://caa/rg-followed",
    release_type: "Album",
    secondary_types: "[]",
    viewed_at: null,
    notified_at: "2026-07-05T00:00:00.000Z",
    ...overrides,
  };
}

function followedRows(
  count: number,
  daysOffset: (i: number) => number,
  overrides: Record<string, unknown> = {}
) {
  return Array.from({ length: count }, (_, i) =>
    followedRow({
      id: i + 1,
      release_group_mbid: `rg-${daysOffset(i)}-${i}`,
      album_title: `Album ${i}`,
      release_date: daysAgo(daysOffset(i)),
      release_key: `album${i}|x`,
      viewed_at: "2026-07-08T00:00:00.000Z",
      ...overrides,
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFollowedReleases.mockResolvedValue([]);
  mockEnrich.mockImplementation(async (mbids: string[]) =>
    mbids.map(() => null)
  );
});

describe("getNewReleases", () => {
  it("returns empty items when nothing is followed", async () => {
    const result = await getNewReleases(1, NOW);
    expect(result.items).toEqual([]);
    expect(result.windowDays).toBe(90);
  });

  it("maps followed releases with their followedReleaseId", async () => {
    mockGetFollowedReleases.mockResolvedValue([followedRow()]);

    const result = await getNewReleases(1, NOW);
    expect(result.items).toEqual([
      {
        releaseGroupMbid: "rg-followed",
        title: "Followed Album",
        artistName: "Followed Artist",
        artistMbid: "mbid-followed",
        releaseDate: daysAgo(5),
        coverUrl: "https://caa/rg-followed",
        lidarrStatus: null,
        followedReleaseId: 1,
      },
    ]);
  });

  it("filters noisy release types", async () => {
    mockGetFollowedReleases.mockResolvedValue([
      followedRow({ id: 1, secondary_types: '["Live"]' }),
      followedRow({
        id: 2,
        release_group_mbid: "rg-ost",
        secondary_types: '["Soundtrack"]',
      }),
    ]);

    const result = await getNewReleases(1, NOW);
    expect(result.items.map((i) => i.releaseGroupMbid)).toEqual(["rg-ost"]);
  });

  it("drops Various Artists compilations", async () => {
    mockGetFollowedReleases.mockResolvedValue([
      followedRow({
        artist_name: "Various Artists",
        artist_mbid: VARIOUS_ARTISTS_MBID,
      }),
    ]);

    const result = await getNewReleases(1, NOW);
    expect(result.items).toEqual([]);
  });

  it("keeps one entry for a release followed through two of its artists", async () => {
    mockGetFollowedReleases.mockResolvedValue([
      followedRow({ id: 1, artist_name: "First" }),
      followedRow({ id: 2, artist_name: "Second", followed_artist_id: 2 }),
    ]);

    const result = await getNewReleases(1, NOW);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].followedReleaseId).toBe(1);
  });

  it("keeps rows without a release-group MBID", async () => {
    mockGetFollowedReleases.mockResolvedValue([
      followedRow({ id: 1, release_group_mbid: null, album_title: "One" }),
      followedRow({ id: 2, release_group_mbid: null, album_title: "Two" }),
    ]);

    const result = await getNewReleases(1, NOW);
    expect(result.items).toHaveLength(2);
  });

  it("widens the window until the target is filled and reports it", async () => {
    const recentCount = Math.floor(TARGET_ITEM_COUNT / 2);
    mockGetFollowedReleases.mockResolvedValue(
      followedRows(TARGET_ITEM_COUNT, (i) => (i < recentCount ? i + 1 : 40 + i))
    );

    const result = await getNewReleases(1, NOW);
    expect(result.windowDays).toBe(60);
    expect(result.items).toHaveLength(TARGET_ITEM_COUNT);
  });

  it("keeps a 30-day window when the target is already met", async () => {
    mockGetFollowedReleases.mockResolvedValue(
      followedRows(TARGET_ITEM_COUNT + 1, (i) => i + 1)
    );

    const result = await getNewReleases(1, NOW);
    expect(result.windowDays).toBe(30);
    expect(result.items).toHaveLength(TARGET_ITEM_COUNT);
  });

  it("excludes unreleased, undated and out-of-window releases", async () => {
    mockGetFollowedReleases.mockResolvedValue([
      followedRow({
        id: 1,
        release_group_mbid: "a",
        release_date: daysAgo(-3),
      }),
      followedRow({ id: 2, release_group_mbid: "b", release_date: null }),
      followedRow({
        id: 3,
        release_group_mbid: "c",
        release_date: daysAgo(200),
      }),
    ]);

    const result = await getNewReleases(1, NOW);
    expect(result.items).toEqual([]);
  });

  it("puts unseen releases first, then newest", async () => {
    mockGetFollowedReleases.mockResolvedValue([
      followedRow({
        id: 1,
        release_group_mbid: "rg-seen-new",
        release_date: daysAgo(1),
        viewed_at: "2026-07-08T00:00:00.000Z",
      }),
      followedRow({
        id: 2,
        release_group_mbid: "rg-unseen",
        release_date: daysAgo(20),
        viewed_at: null,
      }),
      followedRow({
        id: 3,
        release_group_mbid: "rg-seen-old",
        release_date: daysAgo(10),
        viewed_at: "2026-07-08T00:00:00.000Z",
      }),
    ]);

    const result = await getNewReleases(1, NOW);
    expect(result.items.map((i) => i.releaseGroupMbid)).toEqual([
      "rg-unseen",
      "rg-seen-new",
      "rg-seen-old",
    ]);
  });

  it("caps the shelf at the target with unseen priority", async () => {
    mockGetFollowedReleases.mockResolvedValue([
      ...followedRows(TARGET_ITEM_COUNT + 2, (i) => i + 1),
      followedRow({
        id: 99,
        release_group_mbid: "rg-unseen",
        release_date: daysAgo(25),
        viewed_at: null,
      }),
    ]);

    const result = await getNewReleases(1, NOW);
    expect(result.items).toHaveLength(TARGET_ITEM_COUNT);
    expect(result.items[0].releaseGroupMbid).toBe("rg-unseen");
  });

  it("attaches lidarr status to items with MBIDs", async () => {
    mockGetFollowedReleases.mockResolvedValue([followedRow()]);
    mockEnrich.mockResolvedValue([
      { status: "imported", downloadProgress: null },
    ]);

    const result = await getNewReleases(1, NOW);
    expect(mockEnrich).toHaveBeenCalledWith(["rg-followed"]);
    expect(result.items[0].lidarrStatus).toBe("imported");
  });
});
