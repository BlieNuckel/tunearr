import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResilientFetch = vi.fn();

vi.mock("../resilientFetch", () => ({
  resilientFetch: (...args: unknown[]) => mockResilientFetch(...args),
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { getArtistAlbumsByName } from "./albums";

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function errResponse(status = 500) {
  return { ok: false, status, json: async () => ({}) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getArtistAlbumsByName", () => {
  it("returns [] when artist not found", async () => {
    mockResilientFetch.mockResolvedValueOnce(
      okResponse({ resultCount: 0, results: [] })
    );
    const result = await getArtistAlbumsByName("Nobody");
    expect(result).toEqual([]);
  });

  it("returns [] on artist search HTTP error", async () => {
    mockResilientFetch.mockResolvedValueOnce(errResponse());
    const result = await getArtistAlbumsByName("Foo");
    expect(result).toEqual([]);
  });

  it("maps lookup results to AppleAlbum, filtering non-collections", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(
        okResponse({
          resultCount: 1,
          results: [{ wrapperType: "artist", artistId: 12345 }],
        })
      )
      .mockResolvedValueOnce(
        okResponse({
          resultCount: 3,
          results: [
            { wrapperType: "artist", artistId: 12345 },
            {
              wrapperType: "collection",
              collectionId: 1,
              collectionName: "Album A",
              releaseDate: "2025-01-01T00:00:00Z",
              collectionType: "Album",
              artistName: "Test",
            },
            {
              wrapperType: "collection",
              collectionId: 2,
              collectionName: "Album B",
              releaseDate: "2024-06-01T00:00:00Z",
              artistName: "Test",
            },
          ],
        })
      );

    const result = await getArtistAlbumsByName("Test");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      collectionId: 1,
      collectionName: "Album A",
      releaseDate: "2025-01-01T00:00:00Z",
      collectionType: "Album",
      artistName: "Test",
    });
  });

  it("returns [] when album lookup fails", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(
        okResponse({
          resultCount: 1,
          results: [{ wrapperType: "artist", artistId: 99 }],
        })
      )
      .mockResolvedValueOnce(errResponse(503));

    const result = await getArtistAlbumsByName("X");
    expect(result).toEqual([]);
  });

  it("passes limit through to lookup query", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(
        okResponse({
          resultCount: 1,
          results: [{ wrapperType: "artist", artistId: 7 }],
        })
      )
      .mockResolvedValueOnce(okResponse({ resultCount: 0, results: [] }));

    await getArtistAlbumsByName("X", 5);
    const lookupUrl = mockResilientFetch.mock.calls[1][0] as string;
    expect(lookupUrl).toContain("limit=5");
    expect(lookupUrl).toContain("entity=album");
  });

  it("returns [] when fetch throws", async () => {
    mockResilientFetch.mockRejectedValueOnce(new Error("net"));
    const result = await getArtistAlbumsByName("Z");
    expect(result).toEqual([]);
  });
});
