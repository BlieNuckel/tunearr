import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTopArtists } from "./topArtists";

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

describe("getTopArtists", () => {
  it("finds music section and returns filtered artists", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({
          MediaContainer: {
            Directory: [
              { key: "1", type: "movie", title: "Movies" },
              { key: "2", type: "artist", title: "Music" },
            ],
          },
        })
      )
      .mockResolvedValueOnce(
        okResponse({
          MediaContainer: {
            Metadata: [
              {
                title: "Radiohead",
                viewCount: 150,
                thumb: "/library/metadata/123/thumb",
                Genre: [{ tag: "rock" }, { tag: "alternative" }],
              },
              {
                title: "Silence",
                viewCount: 0,
                thumb: "",
                Genre: [],
              },
              {
                title: "Portishead",
                viewCount: 42,
                thumb: "",
                Genre: [{ tag: "trip-hop" }],
              },
            ],
          },
        })
      );

    const result = await getTopArtists(10);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Radiohead");
    expect(result[0].viewCount).toBe(150);
    expect(result[0].thumb).toBe(
      "/api/plex/thumb?path=%2Flibrary%2Fmetadata%2F123%2Fthumb"
    );
    expect(result[0].genres).toEqual(["rock", "alternative"]);
    expect(result[1].name).toBe("Portishead");
    expect(result[1].thumb).toBe("");
  });

  it("throws when no music section exists", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        MediaContainer: {
          Directory: [{ key: "1", type: "movie", title: "Movies" }],
        },
      })
    );

    await expect(getTopArtists(10)).rejects.toThrow(
      "No music library found in Plex"
    );
  });

  it("throws on sections API error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(getTopArtists(10)).rejects.toThrow("Plex returned 401");
  });
});
