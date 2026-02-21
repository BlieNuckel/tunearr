import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTrackPreview, getTrackPreviews } from "./tracks";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  getTrackPreview.clearCache();
});

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

describe("getTrackPreview", () => {
  it("returns preview URL when track found", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 123,
            title: "Creep",
            preview: "https://cdns-preview.dzcdn.net/stream/creep.mp3",
            artist: { id: 399, name: "Radiohead" },
          },
        ],
        total: 1,
      })
    );

    const result = await getTrackPreview("Radiohead", "Creep");

    expect(result).toBe("https://cdns-preview.dzcdn.net/stream/creep.mp3");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.deezer.com/search/track?q=Radiohead+Creep&limit=1"
    );
  });

  it("returns empty string when no results", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: [], total: 0 })
    );

    const result = await getTrackPreview("Unknown", "Nothing");
    expect(result).toBe("");
  });

  it("returns empty string when preview is empty", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 456,
            title: "Some Track",
            preview: "",
            artist: { id: 1, name: "Artist" },
          },
        ],
        total: 1,
      })
    );

    const result = await getTrackPreview("Artist", "Some Track");
    expect(result).toBe("");
  });

  it("returns empty string on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await getTrackPreview("Radiohead", "Creep");
    expect(result).toBe("");
  });

  it("returns empty string on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const result = await getTrackPreview("Radiohead", "Creep");
    expect(result).toBe("");
  });

  it("uses lowercased artist|title as cache key", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 123,
            title: "Creep",
            preview: "https://example.com/preview.mp3",
            artist: { id: 399, name: "Radiohead" },
          },
        ],
        total: 1,
      })
    );

    await getTrackPreview("Radiohead", "Creep");
    await getTrackPreview("radiohead", "creep");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("getTrackPreviews", () => {
  it("returns map of key to preview URL", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 1,
              title: "Creep",
              preview: "https://example.com/creep.mp3",
              artist: { id: 399, name: "Radiohead" },
            },
          ],
          total: 1,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 2,
              title: "Karma Police",
              preview: "https://example.com/karma.mp3",
              artist: { id: 399, name: "Radiohead" },
            },
          ],
          total: 1,
        })
      );

    const result = await getTrackPreviews([
      { artistName: "Radiohead", title: "Creep" },
      { artistName: "Radiohead", title: "Karma Police" },
    ]);

    expect(result.size).toBe(2);
    expect(result.get("radiohead|creep")).toBe(
      "https://example.com/creep.mp3"
    );
    expect(result.get("radiohead|karma police")).toBe(
      "https://example.com/karma.mp3"
    );
  });

  it("handles tracks with no preview", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 1,
              title: "Creep",
              preview: "https://example.com/creep.mp3",
              artist: { id: 399, name: "Radiohead" },
            },
          ],
          total: 1,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: [], total: 0 })
      );

    const result = await getTrackPreviews([
      { artistName: "Radiohead", title: "Creep" },
      { artistName: "Radiohead", title: "Unreleased" },
    ]);

    expect(result.size).toBe(2);
    expect(result.get("radiohead|creep")).toBe(
      "https://example.com/creep.mp3"
    );
    expect(result.get("radiohead|unreleased")).toBe("");
  });
});
