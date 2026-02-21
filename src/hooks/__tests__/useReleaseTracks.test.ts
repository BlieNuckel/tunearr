import { renderHook, act } from "@testing-library/react";
import useReleaseTracks from "../useReleaseTracks";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReleaseTracks", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => useReleaseTracks());
    expect(result.current.media).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches tracks successfully", async () => {
    const media = [{ position: 1, format: "CD", title: "", tracks: [] }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ media }), { status: 200 })
    );

    const { result } = renderHook(() => useReleaseTracks());
    await act(() => result.current.fetchTracks("release-123"));

    expect(fetch).toHaveBeenCalledWith("/api/musicbrainz/tracks/release-123");
    expect(result.current.media).toEqual(media);
    expect(result.current.loading).toBe(false);
  });

  it("includes artistName as query param when provided", async () => {
    const media = [{ position: 1, format: "CD", title: "", tracks: [] }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ media }), { status: 200 })
    );

    const { result } = renderHook(() => useReleaseTracks());
    await act(() => result.current.fetchTracks("release-123", "Radiohead"));

    expect(fetch).toHaveBeenCalledWith(
      "/api/musicbrainz/tracks/release-123?artistName=Radiohead"
    );
  });

  it("does not append query string when artistName is absent", async () => {
    const media = [{ position: 1, format: "CD", title: "", tracks: [] }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ media }), { status: 200 })
    );

    const { result } = renderHook(() => useReleaseTracks());
    await act(() => result.current.fetchTracks("release-123"));

    expect(fetch).toHaveBeenCalledWith("/api/musicbrainz/tracks/release-123");
  });

  it("sets error on failed fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );

    const { result } = renderHook(() => useReleaseTracks());
    await act(() => result.current.fetchTracks("bad-id"));

    expect(result.current.error).toBe("Not found");
    expect(result.current.media).toEqual([]);
  });
});
