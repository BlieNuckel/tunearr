import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockSave = vi.fn();
const mockRemove = vi.fn();
const mockUpdate = vi.fn();
const mockQuery = vi.fn();

const mockSeenFind = vi.fn();
const mockSeenFindOne = vi.fn();
const mockSeenCreate = vi.fn();
const mockSeenSave = vi.fn();

const mockUserUpdate = vi.fn();

vi.mock("../../db/index", () => ({
  getDataSource: () => ({
    getRepository: (entity: string) => {
      if (entity === "SeenRelease") {
        return {
          find: (...args: unknown[]) => mockSeenFind(...args),
          findOne: (...args: unknown[]) => mockSeenFindOne(...args),
          create: (...args: unknown[]) => mockSeenCreate(...args),
          save: (...args: unknown[]) => mockSeenSave(...args),
        };
      }
      if (entity === "User") {
        return {
          update: (...args: unknown[]) => mockUserUpdate(...args),
        };
      }
      return {
        find: (...args: unknown[]) => mockFind(...args),
        findOne: (...args: unknown[]) => mockFindOne(...args),
        create: (...args: unknown[]) => mockCreate(...args),
        save: (...args: unknown[]) => mockSave(...args),
        remove: (...args: unknown[]) => mockRemove(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
      };
    },
    query: (...args: unknown[]) => mockQuery(...args),
  }),
  FollowedArtist: "FollowedArtist",
  SeenRelease: "SeenRelease",
  User: "User",
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import {
  followArtist,
  unfollowArtist,
  getFollowedArtists,
  getAllFollowedArtists,
  hasSeenRelease,
  recordSeenRelease,
  getSeenReleasesForUser,
  updateLastCheckedAt,
  getUnseenReleaseCount,
  markFollowedReleasesViewed,
} from "./followedService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("followArtist", () => {
  it("returns already_following when row exists", async () => {
    mockFindOne.mockResolvedValue({ id: 5 });
    const result = await followArtist(1, "mbid-1", "Artist");
    expect(result).toEqual({ status: "already_following", id: 5 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a new follow row", async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockReturnValue({
      user_id: 1,
      artist_mbid: "mbid-1",
      artist_name: "Artist",
      last_checked_at: null,
    });
    mockSave.mockResolvedValue({ id: 10 });

    const result = await followArtist(1, "mbid-1", "Artist");
    expect(result).toEqual({ status: "added", id: 10 });
    expect(mockCreate).toHaveBeenCalledWith({
      user_id: 1,
      artist_mbid: "mbid-1",
      artist_name: "Artist",
      last_checked_at: null,
    });
  });
});

describe("unfollowArtist", () => {
  it("returns not_found when missing", async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await unfollowArtist(1, "mbid-1");
    expect(result).toEqual({ status: "not_found" });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes existing follow", async () => {
    const item = { id: 5, artist_name: "Artist" };
    mockFindOne.mockResolvedValue(item);
    const result = await unfollowArtist(1, "mbid-1");
    expect(result).toEqual({ status: "removed" });
    expect(mockRemove).toHaveBeenCalledWith(item);
  });
});

describe("getFollowedArtists", () => {
  it("returns rows for user ordered by created_at DESC", async () => {
    mockFind.mockResolvedValue([]);
    const result = await getFollowedArtists(1);
    expect(result).toEqual([]);
    expect(mockFind).toHaveBeenCalledWith({
      where: { user_id: 1 },
      order: { created_at: "DESC" },
    });
  });
});

describe("getAllFollowedArtists", () => {
  it("returns all rows ordered by created_at ASC", async () => {
    mockFind.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await getAllFollowedArtists();
    expect(result).toHaveLength(2);
    expect(mockFind).toHaveBeenCalledWith({ order: { created_at: "ASC" } });
  });
});

describe("seen releases", () => {
  it("hasSeenRelease returns true when row exists", async () => {
    mockSeenFindOne.mockResolvedValue({ id: 1 });
    const result = await hasSeenRelease(1, "key-1");
    expect(result).toBe(true);
    expect(mockSeenFindOne).toHaveBeenCalledWith({
      where: { followed_artist_id: 1, release_key: "key-1" },
    });
  });

  it("hasSeenRelease returns false when row missing", async () => {
    mockSeenFindOne.mockResolvedValue(null);
    const result = await hasSeenRelease(1, "key-1");
    expect(result).toBe(false);
  });

  it("recordSeenRelease inserts a row", async () => {
    mockSeenCreate.mockImplementation((input) => input);
    mockSeenSave.mockImplementation(async (input) => ({ ...input, id: 7 }));

    const result = await recordSeenRelease({
      followed_artist_id: 1,
      release_key: "key-1",
      source: "musicbrainz",
      album_title: "Album",
      release_date: "2025-01-01",
      external_id: "ext-1",
    });

    expect(result.id).toBe(7);
    expect(mockSeenCreate).toHaveBeenCalledWith({
      followed_artist_id: 1,
      release_key: "key-1",
      source: "musicbrainz",
      album_title: "Album",
      release_date: "2025-01-01",
      external_id: "ext-1",
    });
  });

  it("getSeenReleasesForUser runs join query with limit", async () => {
    mockQuery.mockResolvedValue([{ id: 1, artist_name: "A" }]);
    const result = await getSeenReleasesForUser(3, 10);
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [3, 10]);
    const sqlArg = mockQuery.mock.calls[0][0] as string;
    expect(sqlArg).toContain("seen_releases");
    expect(sqlArg).toContain("followed_artists");
  });
});

describe("updateLastCheckedAt", () => {
  it("calls update with new timestamp", async () => {
    mockUpdate.mockResolvedValue({});
    await updateLastCheckedAt(5, "2025-05-15T12:00:00.000Z");
    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 5 },
      { last_checked_at: "2025-05-15T12:00:00.000Z" }
    );
  });
});

describe("getUnseenReleaseCount", () => {
  it("returns the count from the join query", async () => {
    mockQuery.mockResolvedValue([{ count: 3 }]);
    const result = await getUnseenReleaseCount(7);
    expect(result).toBe(3);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [7]);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("seen_releases");
    expect(sql).toContain("followed_artists");
    expect(sql).toContain("followed_last_viewed_at");
  });

  it("returns 0 when no rows", async () => {
    mockQuery.mockResolvedValue([]);
    const result = await getUnseenReleaseCount(7);
    expect(result).toBe(0);
  });
});

describe("markFollowedReleasesViewed", () => {
  it("updates the user row with a current timestamp", async () => {
    mockUserUpdate.mockResolvedValue({});
    await markFollowedReleasesViewed(9);
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    const [where, patch] = mockUserUpdate.mock.calls[0];
    expect(where).toEqual({ id: 9 });
    expect(
      typeof (patch as { followed_last_viewed_at: string })
        .followed_last_viewed_at
    ).toBe("string");
  });
});
