import { act, renderHook, waitFor } from "@testing-library/react";
import useHighlights from "../useHighlights";
import {
  liveHighlight,
  releaseHighlight,
  requestHighlight,
} from "@/pages/HomePage/__tests__/fixtures";

const mockFetch = vi.fn();

function jsonResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) };
}

const RELEASE = releaseHighlight({ key: "release:1", followedReleaseId: 1 });
const LIVE = liveHighlight({ key: "live:mbid-yves", id: 5 });
const REQUEST = requestHighlight({ key: "request:9", requestId: 9 });

async function renderLoaded() {
  const hook = renderHook(() => useHighlights());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      url === "/api/highlights"
        ? jsonResponse({ items: [RELEASE, LIVE] })
        : jsonResponse({ ok: true })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useHighlights", () => {
  it("fetches the user's highlights", async () => {
    const { result } = renderHook(() => useHighlights());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.highlights).toEqual([RELEASE, LIVE]);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/api/highlights", {
      signal: expect.any(AbortSignal),
    });
  });

  it("exposes an error on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const { result } = await renderLoaded();

    expect(result.current.error).toBe("Failed to fetch highlights");
    expect(result.current.highlights).toBeNull();
  });

  it("dismisses a release by its followed release id and refetches", async () => {
    const { result } = await renderLoaded();
    mockFetch.mockClear();

    await act(() => result.current.dismiss(RELEASE));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/highlights/release/1/dismiss",
      { method: "POST" }
    );
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/highlights", {
        signal: expect.any(AbortSignal),
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("dismisses a touring artist by its card id", async () => {
    const { result } = await renderLoaded();

    await act(() => result.current.dismiss(LIVE));

    expect(mockFetch).toHaveBeenCalledWith("/api/highlights/live/5/dismiss", {
      method: "POST",
    });
  });

  it("dismisses an arrived request by its request id", async () => {
    const { result } = await renderLoaded();

    await act(() => result.current.dismiss(REQUEST));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/highlights/request/9/dismiss",
      { method: "POST" }
    );
  });

  it("removes a dismissed highlight before the server answers", async () => {
    const { result } = await renderLoaded();
    mockFetch.mockImplementation(() => new Promise(() => {}));

    act(() => {
      void result.current.dismiss(RELEASE);
    });

    expect(result.current.highlights).toEqual([LIVE]);
  });

  it("records going for a live date and removes it", async () => {
    const { result } = await renderLoaded();
    mockFetch.mockImplementation(() => new Promise(() => {}));

    act(() => {
      void result.current.markGoing(LIVE);
    });

    expect(result.current.highlights).toEqual([RELEASE]);
    expect(mockFetch).toHaveBeenCalledWith("/api/live/events/100/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: "going" }),
    });
  });

  it("dismisses the artist after recording going, so it stays off Home", async () => {
    const { result } = await renderLoaded();
    mockFetch.mockResolvedValue(jsonResponse({}));

    await act(() => result.current.markGoing(LIVE));

    const urls = mockFetch.mock.calls.map((call) => call[0]);
    expect(urls.indexOf("/api/highlights/live/5/dismiss")).toBeGreaterThan(
      urls.indexOf("/api/live/events/100/response")
    );
  });

  it("does nothing for going when the card has no date of its own", async () => {
    const { result } = await renderLoaded();
    mockFetch.mockClear();

    await act(() => result.current.markGoing({ ...LIVE, closest: null }));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("still refetches when a write fails", async () => {
    const { result } = await renderLoaded();
    mockFetch.mockImplementation((url: string) =>
      url === "/api/highlights"
        ? Promise.resolve(jsonResponse({ items: [RELEASE, LIVE] }))
        : Promise.reject(new Error("offline"))
    );

    await act(() => result.current.dismiss(RELEASE));

    await waitFor(() =>
      expect(result.current.highlights).toEqual([RELEASE, LIVE])
    );
  });

  it("marks an unseen release seen without moving it", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.markSeen(RELEASE));

    expect(mockFetch).toHaveBeenCalledWith("/api/followed/releases/1/viewed", {
      method: "POST",
    });
    expect(result.current.highlights?.[0]).toMatchObject({
      key: "release:1",
      unseen: false,
    });
  });

  it("does not mark a release that was already seen", async () => {
    const { result } = await renderLoaded();
    mockFetch.mockClear();

    act(() => result.current.markSeen({ ...RELEASE, unseen: false }));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
