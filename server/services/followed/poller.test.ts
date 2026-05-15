import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAll = vi.fn();
const mockHasSeen = vi.fn();
const mockRecord = vi.fn();
const mockUpdateChecked = vi.fn();
const mockAggregate = vi.fn();

vi.mock("./followedService", () => ({
  getAllFollowedArtists: () => mockGetAll(),
  hasSeenRelease: (...args: unknown[]) => mockHasSeen(...args),
  recordSeenRelease: (...args: unknown[]) => mockRecord(...args),
  updateLastCheckedAt: (...args: unknown[]) => mockUpdateChecked(...args),
}));

vi.mock("./releaseAggregator", () => ({
  aggregateArtistReleases: (...args: unknown[]) => mockAggregate(...args),
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { runPollOnce } from "./poller";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runPollOnce", () => {
  it("records new releases for established follows", async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1,
        user_id: 10,
        artist_mbid: "mbid-1",
        artist_name: "Test Artist",
        last_checked_at: "2025-01-01T00:00:00.000Z",
      },
    ]);
    mockAggregate.mockResolvedValue([
      {
        release_key: "key-1",
        source: "musicbrainz",
        album_title: "New Album",
        release_date: "2025-04-01",
        external_id: "rg-1",
      },
    ]);
    mockHasSeen.mockResolvedValue(false);

    await runPollOnce();

    expect(mockRecord).toHaveBeenCalledWith({
      followed_artist_id: 1,
      release_key: "key-1",
      source: "musicbrainz",
      album_title: "New Album",
      release_date: "2025-04-01",
      external_id: "rg-1",
    });
    expect(mockUpdateChecked).toHaveBeenCalledTimes(1);
  });

  it("skips releases already in seen_releases", async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1,
        user_id: 10,
        artist_mbid: "mbid-1",
        artist_name: "X",
        last_checked_at: "2025-01-01",
      },
    ]);
    mockAggregate.mockResolvedValue([
      {
        release_key: "key-1",
        source: "musicbrainz",
        album_title: "A",
        release_date: "2025-04-01",
        external_id: "rg-1",
      },
    ]);
    mockHasSeen.mockResolvedValue(true);

    await runPollOnce();

    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockUpdateChecked).toHaveBeenCalledTimes(1);
  });

  it("records every new release on first run regardless of date", async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1,
        user_id: 10,
        artist_mbid: "mbid-1",
        artist_name: "Test Artist",
        last_checked_at: null,
      },
    ]);
    mockAggregate.mockResolvedValue([
      {
        release_key: "key-old",
        source: "musicbrainz",
        album_title: "Old Album",
        release_date: "2010-01-01",
        external_id: "rg-old",
      },
      {
        release_key: "key-new",
        source: "deezer",
        album_title: "New Album",
        release_date: "2025-04-01",
        external_id: "1",
      },
    ]);
    mockHasSeen.mockResolvedValue(false);

    await runPollOnce();

    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(mockUpdateChecked).toHaveBeenCalledTimes(1);
  });

  it("continues other artists when one fails", async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        artist_mbid: "a",
        artist_name: "A",
        last_checked_at: null,
      },
      {
        id: 2,
        user_id: 2,
        artist_mbid: "b",
        artist_name: "B",
        last_checked_at: "2025-01-01",
      },
    ]);
    mockAggregate
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([
        {
          release_key: "k",
          source: "musicbrainz",
          album_title: "Z",
          release_date: "2025-04-01",
          external_id: "rg",
        },
      ]);
    mockHasSeen.mockResolvedValue(false);

    await runPollOnce();

    expect(mockUpdateChecked).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });
});
