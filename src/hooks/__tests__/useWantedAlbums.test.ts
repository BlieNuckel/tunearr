import { renderHook, waitFor } from "@testing-library/react";
import useWantedAlbums from "../useWantedAlbums";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useWantedAlbums", () => {
  it("returns false when no wanted items loaded", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useWantedAlbums());

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/wanted");
    });

    expect(result.current.isAlbumWanted("some-mbid")).toBe(false);
  });

  it("identifies wanted albums by albumMbid", async () => {
    const items = [
      {
        id: 1,
        albumMbid: "rg-1",
        artistName: "Radiohead",
        albumTitle: "OK Computer",
        createdAt: "2024-01-01",
      },
      {
        id: 2,
        albumMbid: "rg-2",
        artistName: "Radiohead",
        albumTitle: "Kid A",
        createdAt: "2024-01-02",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(items), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useWantedAlbums());

    await waitFor(() => {
      expect(result.current.isAlbumWanted("rg-1")).toBe(true);
    });

    expect(result.current.isAlbumWanted("rg-2")).toBe(true);
    expect(result.current.isAlbumWanted("rg-unknown")).toBe(false);
  });

  it("handles fetch failure gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useWantedAlbums());

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(result.current.isAlbumWanted("any-mbid")).toBe(false);
  });

  it("handles non-ok response gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 })
    );

    const { result } = renderHook(() => useWantedAlbums());

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(result.current.isAlbumWanted("any-mbid")).toBe(false);
  });
});
