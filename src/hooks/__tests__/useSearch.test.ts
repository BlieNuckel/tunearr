import { renderHook, act } from "@testing-library/react";
import useSearch from "../useSearch";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSearch", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.albums).toEqual([]);
    expect(result.current.artists).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("skips empty query", async () => {
    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("  "));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sets both albums and artists from the combined endpoint", async () => {
    const releaseGroups = [{ id: "1", title: "OK Computer" }];
    const artists = [{ mbid: "a1", name: "Radiohead" }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ "release-groups": releaseGroups, artists }),
        { status: 200 }
      )
    );

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("radiohead"));

    expect(result.current.albums).toEqual(releaseGroups);
    expect(result.current.artists).toEqual(artists);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(
      "/api/musicbrainz/search/all?"
    );
  });

  it("defaults missing arrays to empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("radiohead"));

    expect(result.current.albums).toEqual([]);
    expect(result.current.artists).toEqual([]);
  });

  it("sets error on a failed search", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
    );

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("test"));

    expect(result.current.albums).toEqual([]);
    expect(result.current.artists).toEqual([]);
    expect(result.current.error).toBe("Rate limited");
  });

  it("handles a network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("test"));

    expect(result.current.error).toBe("Network failure");
    expect(result.current.albums).toEqual([]);
    expect(result.current.artists).toEqual([]);
  });
});
