import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./config", () => ({
  getLidarrConfig: vi.fn(),
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock("./fetch", () => ({ lidarrFetch: mockFetch }));

import { lidarrGet } from "./get";
import { getLidarrConfig } from "./config";

const mockGetLidarrConfig = vi.mocked(getLidarrConfig);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLidarrConfig.mockReturnValue({
    url: "http://lidarr:8686",
    headers: { "X-Api-Key": "test-key", "Content-Type": "application/json" },
  });
});

describe("lidarrGet", () => {
  it("builds correct URL with path and query params", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ result: "ok" }),
    });

    await lidarrGet("/artist", { page: 1, pageSize: 20 });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://lidarr:8686/api/v1/artist?page=1&pageSize=20",
      {
        headers: {
          "X-Api-Key": "test-key",
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("omits query string when no params given", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [],
    });

    await lidarrGet("/artist");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://lidarr:8686/api/v1/artist",
      expect.any(Object)
    );
  });

  it("returns status, data, and ok from response", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [{ id: 1 }],
    });

    const result = await lidarrGet("/artist");

    expect(result).toEqual({
      status: 200,
      data: [{ id: 1 }],
      ok: true,
    });
  });

  it("returns non-ok response without throwing", async () => {
    mockFetch.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "not found" }),
    });

    const result = await lidarrGet("/artist/999");

    expect(result).toEqual({
      status: 404,
      data: { error: "not found" },
      ok: false,
    });
  });

  it("propagates error when lidarr is not configured", async () => {
    mockGetLidarrConfig.mockImplementation(() => {
      throw new Error("Lidarr not configured");
    });

    await expect(lidarrGet("/artist")).rejects.toThrow("Lidarr not configured");
  });

  it("stringifies query param values", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({}),
    });

    await lidarrGet("/album", { artistId: 42, includeArtist: true });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("artistId=42");
    expect(calledUrl).toContain("includeArtist=true");
  });
});
