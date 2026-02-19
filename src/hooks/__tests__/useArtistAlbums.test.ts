import { renderHook, act } from "@testing-library/react";
import useArtistAlbums from "../useArtistAlbums";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useArtistAlbums", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => useArtistAlbums());
    expect(result.current.albums).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches albums successfully", async () => {
    const releaseGroups = [{ id: "1", title: "Homogenic" }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ "release-groups": releaseGroups }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useArtistAlbums());
    await act(() => result.current.fetchAlbums("Bjork"));

    expect(result.current.albums).toEqual(releaseGroups);
    expect(result.current.loading).toBe(false);
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("searchType=artist");
    expect(url).toContain("q=Bjork");
  });

  it("sets error on failed fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    );

    const { result } = renderHook(() => useArtistAlbums());
    await act(() => result.current.fetchAlbums("test"));

    expect(result.current.error).toBe("Server error");
    expect(result.current.albums).toEqual([]);
  });
});
