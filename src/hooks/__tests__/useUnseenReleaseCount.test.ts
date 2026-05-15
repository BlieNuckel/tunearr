import { renderHook, act, waitFor } from "@testing-library/react";
import useUnseenReleaseCount, {
  __resetUnseenReleaseCountForTests,
} from "../useUnseenReleaseCount";

beforeEach(() => {
  __resetUnseenReleaseCountForTests();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("useUnseenReleaseCount", () => {
  it("loads count on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ count: 5 }));
    const { result } = renderHook(() => useUnseenReleaseCount());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(5);
  });

  it("falls back to 0 on fetch error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 500 }));
    const { result } = renderHook(() => useUnseenReleaseCount());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(0);
  });

  it("markViewed POSTs and zeros count immediately", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ count: 3 }))
      .mockResolvedValueOnce(jsonResponse({ status: "ok" }));

    const { result } = renderHook(() => useUnseenReleaseCount());
    await waitFor(() => expect(result.current.count).toBe(3));

    await act(async () => {
      await result.current.markViewed();
    });

    expect(result.current.count).toBe(0);
    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === "POST"
    );
    expect(postCall?.[0]).toBe("/api/followed/mark-viewed");
  });

  it("refresh re-fetches", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ count: 1 }))
      .mockResolvedValueOnce(jsonResponse({ count: 7 }));

    const { result } = renderHook(() => useUnseenReleaseCount());
    await waitFor(() => expect(result.current.count).toBe(1));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.count).toBe(7);
  });
});
