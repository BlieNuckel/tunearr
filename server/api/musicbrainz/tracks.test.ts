import { describe, it, expect, vi, beforeEach } from "vitest";
import { getReleaseTracks } from "./tracks";

vi.mock("./config", () => ({
  MB_BASE: "https://musicbrainz.test/ws/2",
  MB_HEADERS: { "User-Agent": "test" },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getReleaseTracks", () => {
  it("maps tracks from first release", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          releases: [
            {
              media: [
                {
                  position: 1,
                  format: "CD",
                  title: "Disc 1",
                  tracks: [
                    {
                      position: 1,
                      title: "Track One",
                      length: 240000,
                      recording: { title: "Track One Recording" },
                    },
                    {
                      position: 2,
                      title: "Track Two",
                      length: null,
                      recording: { title: "Track Two Recording" },
                    },
                  ],
                },
              ],
            },
          ],
        }),
    });

    const result = await getReleaseTracks("rg-123");
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(1);
    expect(result[0].format).toBe("CD");
    expect(result[0].tracks).toHaveLength(2);
    expect(result[0].tracks[0].title).toBe("Track One Recording");
    expect(result[0].tracks[1].length).toBeNull();
  });

  it("returns empty array when no releases", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ releases: [] }),
    });

    const result = await getReleaseTracks("rg-empty");
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(getReleaseTracks("bad")).rejects.toThrow(
      "MusicBrainz returned 404"
    );
  });

  it("handles release with empty media", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ releases: [{ media: [] }] }),
    });

    const result = await getReleaseTracks("rg-no-media");
    expect(result).toEqual([]);
  });
});
