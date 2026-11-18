import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./server", () => ({
  getMbServer: () => ({
    root: "https://musicbrainz.org",
    baseUrl: "https://musicbrainz.org/ws/2",
    kind: "official",
    intervalMs: 1100,
  }),
}));

const mockMbFetch = vi.fn();
const mockAcquireMbSlot = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("../resilientFetch", () => ({
  resilientFetch: (...args: unknown[]) => mockMbFetch(...args),
}));

vi.mock("./queue", () => ({
  acquireMbSlot: (...args: unknown[]) => mockAcquireMbSlot(...args),
  reportMbSuccess: () => {},
  reportMbThrottled: () => {},
}));

import { getArtistMbidByName, getArtistById, searchArtists } from "./artists";
import { clearMbCache } from "./cache";

beforeEach(() => {
  vi.clearAllMocks();
  mockAcquireMbSlot.mockResolvedValue(undefined);
  clearMbCache();
});

describe("getArtistMbidByName", () => {
  it("returns the top-matching artist's MBID", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ artists: [{ id: "mbid-1", name: "X" }] }),
    });

    expect(await getArtistMbidByName("Radiohead")).toBe("mbid-1");
  });

  it("returns null when there are no matches", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ artists: [] }),
    });

    expect(await getArtistMbidByName("Nonexistent Band")).toBeNull();
  });

  it("caches results across calls (including misses)", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ artists: [{ id: "mbid-1", name: "X" }] }),
    });

    await getArtistMbidByName("Radiohead");
    await getArtistMbidByName("radiohead");
    expect(mockMbFetch).toHaveBeenCalledTimes(1);
  });

  it("does not cache transient failures", async () => {
    mockMbFetch.mockResolvedValueOnce({ ok: false, json: () => {} });
    expect(await getArtistMbidByName("Radiohead")).toBeNull();

    mockMbFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ artists: [{ id: "mbid-1", name: "X" }] }),
    });
    expect(await getArtistMbidByName("Radiohead")).toBe("mbid-1");
    expect(mockMbFetch).toHaveBeenCalledTimes(2);
  });

  it("returns null when the fetch throws", async () => {
    mockMbFetch.mockRejectedValue(new Error("network"));
    expect(await getArtistMbidByName("Radiohead")).toBeNull();
  });
});

describe("getArtistById", () => {
  it("maps a MusicBrainz artist into ArtistInfo", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "mbid-1",
          name: "Radiohead",
          disambiguation: "UK band",
          type: "Group",
          country: "GB",
        }),
    });

    expect(await getArtistById("mbid-1")).toEqual({
      mbid: "mbid-1",
      name: "Radiohead",
      disambiguation: "UK band",
      type: "Group",
      country: "GB",
    });
  });

  it("omits empty optional fields", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "mbid-1",
          name: "Radiohead",
          disambiguation: "",
        }),
    });

    expect(await getArtistById("mbid-1")).toEqual({
      mbid: "mbid-1",
      name: "Radiohead",
      disambiguation: undefined,
      type: undefined,
      country: undefined,
    });
  });

  it("returns null on a failed lookup", async () => {
    mockMbFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    expect(await getArtistById("missing")).toBeNull();
  });
});

describe("searchArtists", () => {
  it("maps matching artists into ArtistInfo entities", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          artists: [
            { id: "a1", name: "Radiohead", type: "Group", country: "GB" },
            { id: "a2", name: "Radio Dept." },
          ],
        }),
    });

    expect(await searchArtists("radio")).toEqual([
      {
        mbid: "a1",
        name: "Radiohead",
        disambiguation: undefined,
        type: "Group",
        country: "GB",
      },
      {
        mbid: "a2",
        name: "Radio Dept.",
        disambiguation: undefined,
        type: undefined,
        country: undefined,
      },
    ]);
  });

  it("returns an empty array when there are no matches", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ artists: [] }),
    });

    expect(await searchArtists("zzz")).toEqual([]);
  });

  it("throws when MusicBrainz returns an error", async () => {
    mockMbFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    await expect(searchArtists("radio")).rejects.toThrow("503");
  });
});

describe("priming from artist search", () => {
  it("lets a later lookup of a listed artist skip MusicBrainz, without the score", async () => {
    mockMbFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          artists: [
            {
              id: "a1",
              name: "Radiohead",
              score: 100,
              disambiguation: null,
              type: "Group",
              country: "GB",
            },
          ],
        }),
    });

    await searchArtists("radiohead");
    mockMbFetch.mockClear();

    expect(await getArtistById("a1")).toEqual({
      mbid: "a1",
      name: "Radiohead",
      type: "Group",
      country: "GB",
    });
    expect(mockMbFetch).not.toHaveBeenCalled();
  });

  it("never overwrites an artist already looked up directly", async () => {
    mockMbFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ id: "a1", name: "Radiohead", country: "GB" }),
    });
    await getArtistById("a1");

    mockMbFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          artists: [{ id: "a1", name: "Radiohead (search)", score: 90 }],
        }),
    });
    await searchArtists("radiohead");

    expect((await getArtistById("a1"))?.name).toBe("Radiohead");
  });
});
