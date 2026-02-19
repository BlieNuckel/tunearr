import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrAddArtist, getOrAddAlbum, getAlbumByMbid } from "./helpers";
import type { LidarrArtist, LidarrAlbum } from "../../lidarrApi/types";

vi.mock("../../config", () => ({
  getConfigValue: vi.fn(() => 1),
}));

vi.mock("../../lidarrApi/get", () => ({
  lidarrGet: vi.fn(),
}));

vi.mock("../../lidarrApi/post", () => ({
  lidarrPost: vi.fn(),
}));

import { lidarrGet } from "../../lidarrApi/get";
import { lidarrPost } from "../../lidarrApi/post";

const mockLidarrGet = vi.mocked(lidarrGet);
const mockLidarrPost = vi.mocked(lidarrPost);

beforeEach(() => {
  vi.clearAllMocks();
});

const mockArtist: LidarrArtist = {
  id: 1,
  artistName: "Radiohead",
  foreignArtistId: "artist-mbid-1",
  monitored: true,
  folder: "/music/Radiohead",
};

const mockAlbum: LidarrAlbum = {
  id: 10,
  title: "OK Computer",
  foreignAlbumId: "album-mbid-1",
  monitored: true,
  artist: { id: 1, artistName: "Radiohead", foreignArtistId: "artist-mbid-1" },
};

describe("getAlbumByMbid", () => {
  it("returns album from lookup", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: [mockAlbum],
      ok: true,
    });

    const result = await getAlbumByMbid("album-mbid-1");
    expect(result).toEqual(mockAlbum);
    expect(mockLidarrGet).toHaveBeenCalledWith("/album/lookup", {
      term: "lidarr:album-mbid-1",
    });
  });

  it("throws when album not found", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: [], ok: true });

    await expect(getAlbumByMbid("bad-mbid")).rejects.toThrow("Album not found");
  });

  it("throws on non-200 status", async () => {
    mockLidarrGet.mockResolvedValue({ status: 404, data: [], ok: false });

    await expect(getAlbumByMbid("bad-mbid")).rejects.toThrow("Album not found");
  });
});

describe("getOrAddArtist", () => {
  it("returns existing artist without adding", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: [mockArtist],
      ok: true,
    });

    const result = await getOrAddArtist("artist-mbid-1");
    expect(result).toEqual(mockArtist);
    expect(mockLidarrPost).not.toHaveBeenCalled();
  });

  it("adds artist when not found in library", async () => {
    mockLidarrGet
      .mockResolvedValueOnce({ status: 200, data: [], ok: true })
      .mockResolvedValueOnce({
        status: 200,
        data: [mockArtist],
        ok: true,
      });

    mockLidarrPost.mockResolvedValue({
      status: 201,
      data: mockArtist,
      ok: true,
    });

    const result = await getOrAddArtist("new-artist-mbid");
    expect(result).toEqual(mockArtist);
    expect(mockLidarrPost).toHaveBeenCalledWith(
      "/artist",
      expect.objectContaining({ monitored: true })
    );
  });

  it("throws when artist lookup fails", async () => {
    mockLidarrGet
      .mockResolvedValueOnce({ status: 200, data: [], ok: true })
      .mockResolvedValueOnce({ status: 200, data: [], ok: true });

    await expect(getOrAddArtist("unknown")).rejects.toThrow(
      "Artist not found in Lidarr lookup"
    );
  });
});

describe("getOrAddAlbum", () => {
  it("returns existing album with wasAdded=false", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: [mockAlbum],
      ok: true,
    });

    const result = await getOrAddAlbum("album-mbid-1", mockArtist);
    expect(result.wasAdded).toBe(false);
    expect(result.album).toEqual(mockAlbum);
    expect(mockLidarrPost).not.toHaveBeenCalled();
  });

  it("adds album when not found and returns wasAdded=true", async () => {
    mockLidarrGet
      .mockResolvedValueOnce({ status: 200, data: [], ok: true })
      .mockResolvedValueOnce({ status: 200, data: [mockAlbum], ok: true });

    mockLidarrPost.mockResolvedValue({
      status: 201,
      data: mockAlbum,
      ok: true,
    });

    const result = await getOrAddAlbum("new-album-mbid", mockArtist);
    expect(result.wasAdded).toBe(true);
    expect(result.album).toEqual(mockAlbum);
  });

  it("throws when album add fails", async () => {
    mockLidarrGet
      .mockResolvedValueOnce({ status: 200, data: [], ok: true })
      .mockResolvedValueOnce({ status: 200, data: [mockAlbum], ok: true });

    mockLidarrPost.mockResolvedValue({
      status: 400,
      data: [{ errorMessage: "Album already exists" }],
      ok: false,
    });

    await expect(getOrAddAlbum("dup-mbid", mockArtist)).rejects.toThrow(
      "Failed to add album: Album already exists"
    );
  });
});
