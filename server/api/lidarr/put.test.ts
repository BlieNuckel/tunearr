import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./config", () => ({
  getLidarrConfig: vi.fn(),
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock("./fetch", () => ({ lidarrFetch: mockFetch }));

import { lidarrPut } from "./put";
import { getLidarrConfig } from "./config";

const mockGetLidarrConfig = vi.mocked(getLidarrConfig);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLidarrConfig.mockReturnValue({
    url: "http://lidarr:8686",
    headers: { "X-Api-Key": "test-key", "Content-Type": "application/json" },
  });
});

describe("lidarrPut", () => {
  it("sends PUT request with JSON body", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ success: true }),
    });

    await lidarrPut("/album/monitor", { albumIds: [10], monitored: true });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://lidarr:8686/api/v1/album/monitor",
      {
        method: "PUT",
        headers: {
          "X-Api-Key": "test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ albumIds: [10], monitored: true }),
      }
    );
  });

  it("returns status, data, and ok from response", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ updated: true }),
    });

    const result = await lidarrPut("/album/monitor", {});

    expect(result).toEqual({
      status: 200,
      data: { updated: true },
      ok: true,
    });
  });

  it("returns non-ok response without throwing", async () => {
    mockFetch.mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ message: "Internal error" }),
    });

    const result = await lidarrPut("/album/monitor", {});

    expect(result).toEqual({
      status: 500,
      data: { message: "Internal error" },
      ok: false,
    });
  });

  it("propagates error when lidarr is not configured", async () => {
    mockGetLidarrConfig.mockImplementation(() => {
      throw new Error("Lidarr not configured");
    });

    await expect(lidarrPut("/album/monitor", {})).rejects.toThrow(
      "Lidarr not configured"
    );
  });
});
