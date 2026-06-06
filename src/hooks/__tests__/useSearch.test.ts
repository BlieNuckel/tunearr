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
    expect(result.current.kind).toBe("album");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("skips empty query", async () => {
    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("  ", "album"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sets albums on a successful album search", async () => {
    const releaseGroups = [{ id: "1", title: "OK Computer" }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ "release-groups": releaseGroups }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("radiohead", "album"));

    expect(result.current.albums).toEqual(releaseGroups);
    expect(result.current.kind).toBe("album");
    expect(result.current.error).toBeNull();
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(
      "/api/musicbrainz/search?"
    );
  });

  it("sets artists on a successful artist search", async () => {
    const artists = [{ mbid: "a1", name: "Radiohead" }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ artists }), { status: 200 })
    );

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("radiohead", "artist"));

    expect(result.current.artists).toEqual(artists);
    expect(result.current.albums).toEqual([]);
    expect(result.current.kind).toBe("artist");
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(
      "/api/musicbrainz/artist/search?"
    );
  });

  it("sets error on a failed search", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
    );

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("test", "album"));

    expect(result.current.albums).toEqual([]);
    expect(result.current.error).toBe("Rate limited");
  });

  it("handles a network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.search("test", "album"));

    expect(result.current.error).toBe("Network failure");
    expect(result.current.albums).toEqual([]);
    expect(result.current.artists).toEqual([]);
  });
});
