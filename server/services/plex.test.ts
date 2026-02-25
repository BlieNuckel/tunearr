import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetPlexConfig = vi.fn();
const mockFetch = vi.fn();

vi.mock("../api/plex/config", () => ({
  getPlexConfig: (...args: unknown[]) => mockGetPlexConfig(...args),
}));

vi.stubGlobal("fetch", mockFetch);

import { fetchPlexThumbnail } from "./plex";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchPlexThumbnail", () => {
  it("returns buffer and content type on success", async () => {
    mockGetPlexConfig.mockReturnValue({
      baseUrl: "http://plex:32400",
      headers: { "X-Plex-Token": "token123" },
    });

    const imageBuffer = new ArrayBuffer(4);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: async () => imageBuffer,
    });

    const result = await fetchPlexThumbnail("/library/metadata/123/thumb");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contentType).toBe("image/jpeg");
      expect(result.buffer).toBeInstanceOf(Buffer);
    }
    expect(mockFetch).toHaveBeenCalledWith(
      "http://plex:32400/library/metadata/123/thumb",
      expect.objectContaining({
        headers: { "X-Plex-Token": "token123" },
      })
    );
  });

  it("returns error status on non-ok upstream", async () => {
    mockGetPlexConfig.mockReturnValue({
      baseUrl: "http://plex:32400",
      headers: { "X-Plex-Token": "token123" },
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Map(),
    });

    const result = await fetchPlexThumbnail("/bad/path");
    expect(result).toEqual({ ok: false, status: 404 });
  });
});
