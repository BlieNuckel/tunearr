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
  return { ok: true, json: async () => body, status: 200 };
}

function notFoundResponse() {
  return { ok: false, status: 404, json: async () => ({}) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getArtistAlbumsByName", () => {
  it("returns empty array when artist lookup fails", async () => {
    mockResilientFetch.mockResolvedValueOnce(okResponse({ data: [] }));

    const result = await getArtistAlbumsByName("Unknown Artist");
    expect(result).toEqual([]);
    expect(mockResilientFetch).toHaveBeenCalledTimes(1);
  });

  it("returns empty array on artist search HTTP error", async () => {
    mockResilientFetch.mockResolvedValueOnce(notFoundResponse());
    const result = await getArtistAlbumsByName("Some Artist");
    expect(result).toEqual([]);
  });

  it("fetches albums for resolved artist id", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(
        okResponse({ data: [{ id: 42, name: "Radiohead" }] })
      )
      .mockResolvedValueOnce(
        okResponse({
          data: [
            { id: 1, title: "OK Computer", release_date: "1997-06-16" },
            { id: 2, title: "Kid A", release_date: "2000-10-02" },
          ],
        })
      );

    const result = await getArtistAlbumsByName("Radiohead");
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("OK Computer");
    const secondCallUrl = mockResilientFetch.mock.calls[1][0] as string;
    expect(secondCallUrl).toContain("/artist/42/albums");
  });

  it("returns empty array when album fetch fails", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(okResponse({ data: [{ id: 42, name: "Foo" }] }))
      .mockResolvedValueOnce(notFoundResponse());

    const result = await getArtistAlbumsByName("Foo");
    expect(result).toEqual([]);
  });

  it("returns empty array if resilientFetch throws on artist search", async () => {
    mockResilientFetch.mockRejectedValueOnce(new Error("network"));
    const result = await getArtistAlbumsByName("Foo");
    expect(result).toEqual([]);
  });

  it("returns empty array if resilientFetch throws on album fetch", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(okResponse({ data: [{ id: 1, name: "Bar" }] }))
      .mockRejectedValueOnce(new Error("network"));
    const result = await getArtistAlbumsByName("Bar");
    expect(result).toEqual([]);
  });

  it("respects limit query param", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(okResponse({ data: [{ id: 7, name: "X" }] }))
      .mockResolvedValueOnce(okResponse({ data: [] }));

    await getArtistAlbumsByName("X", 5);
    const url = mockResilientFetch.mock.calls[1][0] as string;
    expect(url).toContain("limit=5");
  });
});
