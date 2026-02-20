import { renderHook, act, waitFor } from "@testing-library/react";
import usePromotedAlbum from "../usePromotedAlbum";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

const albumData = {
  album: {
    name: "OK Computer",
    mbid: "alb-1",
    artistName: "Radiohead",
    artistMbid: "art-1",
    coverUrl: "https://coverartarchive.org/release-group/alb-1/front-500",
  },
  tag: "alternative",
  inLibrary: false,
};

describe("usePromotedAlbum", () => {
  it("has correct initial state", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePromotedAlbum());
    expect(result.current.promotedAlbum).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("fetches promoted album on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(albumData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => usePromotedAlbum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.promotedAlbum).toEqual(albumData);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/promoted-album");
  });

  it("handles null response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => usePromotedAlbum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.promotedAlbum).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets error on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    );

    const { result } = renderHook(() => usePromotedAlbum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch promoted album");
    expect(result.current.promotedAlbum).toBeNull();
  });

  it("handles network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => usePromotedAlbum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network failure");
    expect(result.current.promotedAlbum).toBeNull();
  });

  it("refresh calls with refresh param", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(albumData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => usePromotedAlbum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(() => result.current.refresh());

    expect(fetch).toHaveBeenCalledWith("/api/promoted-album?refresh=true");
  });
});
