import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSearchReleaseGroups = vi.fn();
const mockSearchArtists = vi.fn();
const mockGetArtistsImages = vi.fn();

vi.mock("../api/musicbrainz/releaseGroups", () => ({
  searchReleaseGroups: (...args: unknown[]) => mockSearchReleaseGroups(...args),
}));

vi.mock("../api/musicbrainz/artists", () => ({
  searchArtists: (...args: unknown[]) => mockSearchArtists(...args),
}));

vi.mock("../api/deezer/artists", () => ({
  getArtistsImages: (...args: unknown[]) => mockGetArtistsImages(...args),
}));

import { parseSearchParts, searchAll, SEARCH_GRACE_MS } from "./searchAll";
import { MbUnavailableError } from "../api/musicbrainz/errors";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const albums = {
  "release-groups": [{ id: "rg-1", title: "OK Computer" }],
  count: 1,
  offset: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchReleaseGroups.mockResolvedValue(albums);
  mockSearchArtists.mockResolvedValue([
    { mbid: "a1", name: "Radiohead", score: 100 },
  ]);
  mockGetArtistsImages.mockResolvedValue(new Map());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("searchAll", () => {
  it("returns both parts when both arrive", async () => {
    expect(await searchAll("radio")).toEqual({
      "release-groups": albums["release-groups"],
      count: 1,
      artists: [{ mbid: "a1", name: "Radiohead", score: 100 }],
      partial: [],
    });
  });

  it("doesn't let a slow artist search hold back album results", async () => {
    vi.useFakeTimers();
    const slow = deferred<unknown[]>();
    mockSearchArtists.mockReturnValue(slow.promise);

    const pending = searchAll("radio");
    await vi.advanceTimersByTimeAsync(SEARCH_GRACE_MS);
    const result = await pending;

    expect(result["release-groups"]).toEqual(albums["release-groups"]);
    expect(result.artists).toBeUndefined();
    expect(result.partial).toEqual(["artists"]);
    expect(result.retryAfterMs).toBe(1000);
  });

  it("doesn't let a slow album search hold back artist results", async () => {
    vi.useFakeTimers();
    mockSearchReleaseGroups.mockReturnValue(deferred().promise);

    const pending = searchAll("radio");
    await vi.advanceTimersByTimeAsync(SEARCH_GRACE_MS);
    const result = await pending;

    expect(result.artists).toHaveLength(1);
    expect(result.partial).toEqual(["albums"]);
  });

  it("waits for a part that arrives within the grace period", async () => {
    vi.useFakeTimers();
    const slow = deferred<unknown[]>();
    mockSearchArtists.mockReturnValue(slow.promise);

    const pending = searchAll("radio");
    await vi.advanceTimersByTimeAsync(SEARCH_GRACE_MS - 100);
    slow.resolve([{ mbid: "a1", name: "Radiohead", score: 100 }]);
    const result = await pending;

    expect(result.partial).toEqual([]);
    expect(result.artists).toHaveLength(1);
  });

  it("marks a part partial when MusicBrainz is busy, with its retry delay", async () => {
    mockSearchReleaseGroups.mockRejectedValue(
      new MbUnavailableError("busy", 4000)
    );

    const result = await searchAll("radio");

    expect(result.partial).toEqual(["albums"]);
    expect(result.retryAfterMs).toBe(4000);
    expect(result.artists).toHaveLength(1);
  });

  it("never fails a search because MusicBrainz is busy for every part", async () => {
    mockSearchReleaseGroups.mockRejectedValue(
      new MbUnavailableError("busy", 1000)
    );
    mockSearchArtists.mockRejectedValue(new MbUnavailableError("busy", 2000));

    expect(await searchAll("radio")).toEqual({
      partial: ["albums", "artists"],
      retryAfterMs: 2000,
    });
  });

  it("fails on any other error", async () => {
    mockSearchArtists.mockRejectedValue(new Error("boom"));
    await expect(searchAll("radio")).rejects.toThrow("boom");
  });

  it("runs only the requested parts", async () => {
    await searchAll("radio", ["albums"]);
    expect(mockSearchArtists).not.toHaveBeenCalled();
  });
});

describe("parseSearchParts", () => {
  it("defaults to every part", () => {
    expect(parseSearchParts(undefined)).toEqual(["albums", "artists"]);
    expect(parseSearchParts("nonsense")).toEqual(["albums", "artists"]);
  });

  it("keeps the recognized parts", () => {
    expect(parseSearchParts("artists")).toEqual(["artists"]);
    expect(parseSearchParts("albums, bogus")).toEqual(["albums"]);
  });
});
