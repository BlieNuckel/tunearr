import { renderHook, act } from "@testing-library/react";
import useLidarr from "../useLidarr";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLidarr", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => useLidarr());
    expect(result.current.state).toBe("idle");
    expect(result.current.errorMsg).toBeNull();
  });

  it("transitions to success on successful add", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 })
    );

    const { result } = renderHook(() => useLidarr());
    await act(() => result.current.addToLidarr({ albumMbid: "abc-123" }));

    expect(result.current.state).toBe("success");
    expect(result.current.errorMsg).toBeNull();
  });

  it("transitions to already_monitored", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "already_monitored" }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useLidarr());
    await act(() => result.current.addToLidarr({ albumMbid: "abc-123" }));

    expect(result.current.state).toBe("already_monitored");
  });

  it("transitions to error on server error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );

    const { result } = renderHook(() => useLidarr());
    await act(() => result.current.addToLidarr({ albumMbid: "abc-123" }));

    expect(result.current.state).toBe("error");
    expect(result.current.errorMsg).toBe("Not found");
  });

  it("falls back to generic message on invalid JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 })
    );

    const { result } = renderHook(() => useLidarr());
    await act(() => result.current.addToLidarr({ albumMbid: "abc-123" }));

    expect(result.current.state).toBe("error");
    expect(result.current.errorMsg).toBe("Server error (500)");
  });
});
