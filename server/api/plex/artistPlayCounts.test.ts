import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllArtistPlayCounts } from "./artistPlayCounts";

vi.mock("./config", () => ({
  getPlexConfig: vi.fn(() => ({
    baseUrl: "http://plex:32400",
    headers: { "X-Plex-Token": "tok", Accept: "application/json" },
    token: "tok",
  })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

function okResponse(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) };
}

const musicSection = okResponse({
  MediaContainer: { Directory: [{ key: "3", type: "artist", title: "Music" }] },
});

function artistsPage(start: number, count: number, totalSize: number) {
  return okResponse({
    MediaContainer: {
      totalSize,
      Metadata: Array.from({ length: count }, (_, i) => ({
        title: `A${start + i}`,
        viewCount: 5,
      })),
    },
  });
}

describe("getAllArtistPlayCounts", () => {
  it("returns played artists and drops zero-play ones", async () => {
    mockFetch.mockResolvedValueOnce(musicSection).mockResolvedValueOnce(
      okResponse({
        MediaContainer: {
          totalSize: 2,
          Metadata: [
            { title: "Radiohead", viewCount: 150 },
            { title: "Silence", viewCount: 0 },
          ],
        },
      })
    );

    const result = await getAllArtistPlayCounts("tok");

    expect(result).toEqual([{ name: "Radiohead", viewCount: 150 }]);
  });

  it("paginates through every page until totalSize", async () => {
    mockFetch
      .mockResolvedValueOnce(musicSection)
      .mockResolvedValueOnce(artistsPage(0, 200, 450))
      .mockResolvedValueOnce(artistsPage(200, 200, 450))
      .mockResolvedValueOnce(artistsPage(400, 50, 450));

    const result = await getAllArtistPlayCounts("tok");

    expect(result).toHaveLength(450);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("stops early once a page returns fewer played artists than the page size", async () => {
    mockFetch.mockResolvedValueOnce(musicSection).mockResolvedValueOnce(
      okResponse({
        MediaContainer: {
          totalSize: 10000,
          Metadata: [
            { title: "Played", viewCount: 3 },
            { title: "Unplayed", viewCount: 0 },
          ],
        },
      })
    );

    const result = await getAllArtistPlayCounts("tok");

    expect(result).toEqual([{ name: "Played", viewCount: 3 }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws on a Plex API error", async () => {
    mockFetch
      .mockResolvedValueOnce(musicSection)
      .mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(getAllArtistPlayCounts("tok")).rejects.toThrow(
      "Plex returned 500"
    );
  });
});
