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

  describe("partial results", () => {
    const releaseGroups = [{ id: "1", title: "OK Computer" }];
    const artists = [{ mbid: "a1", name: "Radiohead" }];

    function json(body: unknown, status = 200) {
      return new Response(JSON.stringify(body), { status });
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it("keeps what arrived and asks again for only the missing part", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          json({
            "release-groups": releaseGroups,
            partial: ["artists"],
            retryAfterMs: 1000,
          })
        )
        .mockResolvedValueOnce(json({ artists, partial: [] }));

      const { result } = renderHook(() => useSearch());
      await act(() => result.current.search("radiohead"));

      expect(result.current.albums).toEqual(releaseGroups);
      expect(result.current.missing).toEqual(["artists"]);
      expect(result.current.retrying).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(fetch).toHaveBeenLastCalledWith(
        "/api/musicbrainz/search/all?q=radiohead&parts=artists"
      );
      expect(result.current.artists).toEqual(artists);
      expect(result.current.albums).toEqual(releaseGroups);
      expect(result.current.missing).toEqual([]);
      expect(result.current.retrying).toBe(false);
    });

    it("stops after three retries and lets the user ask again", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(
          json({ "release-groups": releaseGroups, partial: ["artists"] })
        )
      );

      const { result } = renderHook(() => useSearch());
      await act(() => result.current.search("radiohead"));
      for (const delay of [1000, 2000, 4000]) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(delay);
        });
      }

      expect(fetch).toHaveBeenCalledTimes(4);
      expect(result.current.retrying).toBe(false);
      expect(result.current.missing).toEqual(["artists"]);

      await act(async () => {
        result.current.retryMissing();
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(fetch).toHaveBeenCalledTimes(5);
    });

    it("treats a retryable error as every requested part missing", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        json(
          { error: "MusicBrainz is busy", retryable: true, retryAfterMs: 1000 },
          503
        )
      );

      const { result } = renderHook(() => useSearch());
      await act(() => result.current.search("radiohead"));

      expect(result.current.error).toBeNull();
      expect(result.current.missing).toEqual(["albums", "artists"]);
      expect(result.current.retrying).toBe(true);
    });

    it("drops a pending retry when a new search starts", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          json({ "release-groups": releaseGroups, partial: ["artists"] })
        )
        .mockResolvedValue(json({ "release-groups": [], artists: [] }));

      const { result } = renderHook(() => useSearch());
      await act(() => result.current.search("radiohead"));
      await act(() => result.current.search("bjork"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.current.missing).toEqual([]);
    });
  });
});
