import { act, renderHook, waitFor } from "@testing-library/react";
import useArtistLiveDates, {
  REFRESH_SOON_DELAY_MS,
} from "../useArtistLiveDates";

const event = { eventKey: "jambase:1", eventDate: "2026-09-05" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useArtistLiveDates", () => {
  it("does not fetch without an mbid", () => {
    const { result } = renderHook(() => useArtistLiveDates(undefined));
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.dates).toEqual([]);
    expect(result.current.tracking).toBeNull();
  });

  it("loads the dates and the tracking state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ events: [event], liveTracking: "tracked" })
    );

    const { result } = renderHook(() => useArtistLiveDates("a1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dates).toEqual([event]);
    expect(result.current.tracking).toBe("tracked");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/live/artist/a1");
  });

  it("reports a failed load", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 500));

    const { result } = renderHook(() => useArtistLiveDates("a1"));

    await waitFor(() =>
      expect(result.current.error).toBe("Failed to fetch live dates")
    );
  });

  describe("refreshSoon", () => {
    it("refetches once, after the follow's lookup has had time to land", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch)
        .mockResolvedValueOnce(json({ events: [], liveTracking: null }))
        .mockResolvedValueOnce(
          json({ events: [event], liveTracking: "tracked" })
        );
      const { result } = renderHook(() => useArtistLiveDates("a1"));
      await act(() => vi.advanceTimersByTimeAsync(0));

      act(() => result.current.refreshSoon());
      await act(() => vi.advanceTimersByTimeAsync(REFRESH_SOON_DELAY_MS - 1));
      expect(fetch).toHaveBeenCalledTimes(1);

      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.current.dates).toEqual([event]);
      expect(result.current.tracking).toBe("tracked");

      await act(() => vi.advanceTimersByTimeAsync(REFRESH_SOON_DELAY_MS * 3));
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("folds repeated calls into one refetch", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(json({ events: [], liveTracking: "pending" }))
      );
      const { result } = renderHook(() => useArtistLiveDates("a1"));
      await act(() => vi.advanceTimersByTimeAsync(0));

      act(() => result.current.refreshSoon());
      act(() => result.current.refreshSoon());
      await act(() => vi.advanceTimersByTimeAsync(REFRESH_SOON_DELAY_MS));

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("drops a pending refetch on unmount", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(json({ events: [], liveTracking: "pending" }))
      );
      const { result, unmount } = renderHook(() => useArtistLiveDates("a1"));
      await act(() => vi.advanceTimersByTimeAsync(0));

      act(() => result.current.refreshSoon());
      expect(vi.getTimerCount()).toBe(1);
      unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    it("drops a pending refetch when the artist changes", async () => {
      vi.useFakeTimers();
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(json({ events: [], liveTracking: "pending" }))
      );
      const { result, rerender } = renderHook(
        ({ mbid }) => useArtistLiveDates(mbid),
        { initialProps: { mbid: "a1" } }
      );
      await act(() => vi.advanceTimersByTimeAsync(0));

      act(() => result.current.refreshSoon());
      rerender({ mbid: "a2" });
      await act(() => vi.advanceTimersByTimeAsync(REFRESH_SOON_DELAY_MS));

      expect(vi.mocked(fetch).mock.calls.map((call) => call[0])).toEqual([
        "/api/live/artist/a1",
        "/api/live/artist/a2",
      ]);
    });
  });
});
