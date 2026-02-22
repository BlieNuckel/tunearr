import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./config", () => ({
  getLidarrConfig: vi.fn(),
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock("./fetch", () => ({ lidarrFetch: mockFetch }));

import { lidarrPost } from "./post";
import { getLidarrConfig } from "./config";

const mockGetLidarrConfig = vi.mocked(getLidarrConfig);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLidarrConfig.mockReturnValue({
    url: "http://lidarr:8686",
    headers: { "X-Api-Key": "test-key", "Content-Type": "application/json" },
  });
});

describe("lidarrPost", () => {
  it("sends POST request with JSON body", async () => {
    mockFetch.mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ id: 1 }),
    });

    await lidarrPost("/artist", { name: "Radiohead", monitored: true });

    expect(mockFetch).toHaveBeenCalledWith("http://lidarr:8686/api/v1/artist", {
      method: "POST",
      headers: { "X-Api-Key": "test-key", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Radiohead", monitored: true }),
    });
  });

  it("returns status, data, and ok from response", async () => {
    mockFetch.mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ id: 1, name: "Radiohead" }),
    });

    const result = await lidarrPost("/artist", {});

    expect(result).toEqual({
      status: 201,
      data: { id: 1, name: "Radiohead" },
      ok: true,
    });
  });

  it("returns non-ok response without throwing", async () => {
    mockFetch.mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => [{ errorMessage: "Validation failed" }],
    });

    const result = await lidarrPost("/artist", {});

    expect(result).toEqual({
      status: 400,
      data: [{ errorMessage: "Validation failed" }],
      ok: false,
    });
  });

  it("propagates error when lidarr is not configured", async () => {
    mockGetLidarrConfig.mockImplementation(() => {
      throw new Error("Lidarr not configured");
    });

    await expect(lidarrPost("/artist", {})).rejects.toThrow(
      "Lidarr not configured"
    );
  });
});
