import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAlbumByMbid = vi.fn();
const mockGetOrAddArtist = vi.fn();
const mockGetOrAddAlbum = vi.fn();
const mockLidarrPost = vi.fn();
const mockLidarrPut = vi.fn();

vi.mock("../../api/lidarr/post", () => ({
  lidarrPost: (...args: unknown[]) => mockLidarrPost(...args),
}));

vi.mock("../../api/lidarr/put", () => ({
  lidarrPut: (...args: unknown[]) => mockLidarrPut(...args),
}));

vi.mock("../lidarr/helpers", () => ({
  getAlbumByMbid: (...args: unknown[]) => mockGetAlbumByMbid(...args),
  getOrAddArtist: (...args: unknown[]) => mockGetOrAddArtist(...args),
  getOrAddAlbum: (...args: unknown[]) => mockGetOrAddAlbum(...args),
}));

import { fulfillRequest } from "./fulfillRequest";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fulfillRequest", () => {
  it("throws when album has no artist", async () => {
    mockGetAlbumByMbid.mockResolvedValue({ artist: {} });

    await expect(fulfillRequest("mbid-1")).rejects.toThrow(
      "Could not determine artist"
    );
  });

  it("returns already_monitored when album exists and is monitored", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      title: "Test Album",
      artist: { foreignArtistId: "art-1", artistName: "Test Artist" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: false,
      album: { id: 10, monitored: true },
    });

    const result = await fulfillRequest("mbid-1");
    expect(result.status).toBe("already_monitored");
    expect(result.artistName).toBe("Test Artist");
    expect(result.albumTitle).toBe("Test Album");
    expect(mockLidarrPut).not.toHaveBeenCalled();
  });

  it("monitors and searches when album exists but is unmonitored", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      title: "Test Album",
      artist: { foreignArtistId: "art-1", artistName: "Test Artist" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: false,
      album: { id: 10, monitored: false },
    });
    mockLidarrPut.mockResolvedValue({ ok: true });
    mockLidarrPost.mockResolvedValue({ ok: true });

    const result = await fulfillRequest("mbid-1");
    expect(result.status).toBe("success");
    expect(mockLidarrPut).toHaveBeenCalledWith("/album/monitor", {
      albumIds: [10],
      monitored: true,
    });
    expect(mockLidarrPost).toHaveBeenCalledWith("/command", {
      name: "AlbumSearch",
      albumIds: [10],
    });
  });

  it("searches when album is newly added", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      title: "Test Album",
      artist: { foreignArtistId: "art-1", artistName: "Test Artist" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: true,
      album: { id: 10, monitored: true },
    });
    mockLidarrPost.mockResolvedValue({ ok: true });

    const result = await fulfillRequest("mbid-1");
    expect(result.status).toBe("success");
    expect(mockLidarrPut).not.toHaveBeenCalled();
  });

  it("throws when monitor call fails", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      title: "Test Album",
      artist: { foreignArtistId: "art-1", artistName: "Test Artist" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: false,
      album: { id: 10, monitored: false },
    });
    mockLidarrPut.mockResolvedValue({ ok: false });

    await expect(fulfillRequest("mbid-1")).rejects.toThrow(
      "Failed to monitor album"
    );
  });
});
