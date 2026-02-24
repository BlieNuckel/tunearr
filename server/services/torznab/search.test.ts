import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStartSearch = vi.fn();
const mockWaitForSearch = vi.fn();
const mockGetSearchResponses = vi.fn();
const mockDeleteSearch = vi.fn();
const mockGroupSearchResults = vi.fn();

vi.mock("../../api/slskd/search", () => ({
  startSearch: (...args: unknown[]) => mockStartSearch(...args),
  waitForSearch: (...args: unknown[]) => mockWaitForSearch(...args),
  getSearchResponses: (...args: unknown[]) => mockGetSearchResponses(...args),
  deleteSearch: (...args: unknown[]) => mockDeleteSearch(...args),
}));

vi.mock("../../api/slskd/groupResults", () => ({
  groupSearchResults: (...args: unknown[]) => mockGroupSearchResults(...args),
}));

import {
  getOrSearchResults,
  buildSearchQuery,
  cacheResultsForDownload,
  getCachedResult,
  cleanExpiredCaches,
} from "./search";

beforeEach(() => {
  vi.clearAllMocks();
  cleanExpiredCaches();
});

describe("buildSearchQuery", () => {
  it("returns q when provided", () => {
    expect(buildSearchQuery({ q: "radiohead" })).toBe("radiohead");
  });

  it("combines artist and album", () => {
    expect(
      buildSearchQuery({ artist: "Radiohead", album: "OK Computer" })
    ).toBe("Radiohead OK Computer");
  });

  it("returns just artist when no album", () => {
    expect(buildSearchQuery({ artist: "Radiohead" })).toBe("Radiohead");
  });

  it("returns empty string when no params", () => {
    expect(buildSearchQuery({})).toBe("");
  });

  it("prefers q over artist/album", () => {
    expect(
      buildSearchQuery({ q: "query", artist: "Artist", album: "Album" })
    ).toBe("query");
  });
});

describe("getOrSearchResults", () => {
  it("searches slskd and returns grouped results", async () => {
    mockStartSearch.mockResolvedValue({ id: "s1" });
    mockWaitForSearch.mockResolvedValue({ completed: true });
    mockGetSearchResponses.mockResolvedValue([{ fileCount: 5 }]);
    mockDeleteSearch.mockResolvedValue(undefined);
    const results = [{ guid: "g1", directory: "Music\\Album" }];
    mockGroupSearchResults.mockReturnValue(results);

    const actual = await getOrSearchResults("test query");

    expect(actual).toEqual(results);
    expect(mockStartSearch).toHaveBeenCalledWith("test query");
  });

  it("serves from cache on repeated queries", async () => {
    mockStartSearch.mockResolvedValue({ id: "s1" });
    mockWaitForSearch.mockResolvedValue({ completed: true });
    mockGetSearchResponses.mockResolvedValue([]);
    mockDeleteSearch.mockResolvedValue(undefined);
    mockGroupSearchResults.mockReturnValue([{ guid: "g1" }]);

    await getOrSearchResults("cached query");
    await getOrSearchResults("cached query");

    expect(mockStartSearch).toHaveBeenCalledTimes(1);
  });
});

describe("result cache", () => {
  it("caches and retrieves results by guid", () => {
    const results = [
      { guid: "g1", directory: "Music\\Album" },
      { guid: "g2", directory: "Music\\Album2" },
    ];

    cacheResultsForDownload(
      results as Parameters<typeof cacheResultsForDownload>[0]
    );

    expect(getCachedResult("g1")).toEqual(results[0]);
    expect(getCachedResult("g2")).toEqual(results[1]);
    expect(getCachedResult("nonexistent")).toBeNull();
  });
});
