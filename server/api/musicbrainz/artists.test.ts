import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRateLimitedMbFetch = vi.fn();

vi.mock("./config", () => ({
  MB_BASE: "https://musicbrainz.org/ws/2",
  MB_HEADERS: { "User-Agent": "test" },
  rateLimitedMbFetch: (...args: unknown[]) => mockRateLimitedMbFetch(...args),
}));

import { getArtistMbidByName, clearArtistMbidCache } from "./artists";

beforeEach(() => {
  vi.clearAllMocks();
  clearArtistMbidCache();
});

describe("getArtistMbidByName", () => {
  it("returns the top-matching artist's MBID", async () => {
    mockRateLimitedMbFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ artists: [{ id: "mbid-1", name: "X" }] }),
    });

    expect(await getArtistMbidByName("Radiohead")).toBe("mbid-1");
  });

  it("returns null when there are no matches", async () => {
    mockRateLimitedMbFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ artists: [] }),
    });

    expect(await getArtistMbidByName("Nonexistent Band")).toBeNull();
  });

  it("caches results across calls (including misses)", async () => {
    mockRateLimitedMbFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ artists: [{ id: "mbid-1", name: "X" }] }),
    });

    await getArtistMbidByName("Radiohead");
    await getArtistMbidByName("radiohead");
    expect(mockRateLimitedMbFetch).toHaveBeenCalledTimes(1);
  });

  it("does not cache transient failures", async () => {
    mockRateLimitedMbFetch.mockResolvedValueOnce({ ok: false, json: () => {} });
    expect(await getArtistMbidByName("Radiohead")).toBeNull();

    mockRateLimitedMbFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ artists: [{ id: "mbid-1", name: "X" }] }),
    });
    expect(await getArtistMbidByName("Radiohead")).toBe("mbid-1");
    expect(mockRateLimitedMbFetch).toHaveBeenCalledTimes(2);
  });

  it("returns null when the fetch throws", async () => {
    mockRateLimitedMbFetch.mockRejectedValue(new Error("network"));
    expect(await getArtistMbidByName("Radiohead")).toBeNull();
  });
});
