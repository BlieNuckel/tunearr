import { renderHook, act } from "@testing-library/react";
import usePurchase from "../usePurchase";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePurchase", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => usePurchase());
    expect(result.current.state).toBe("idle");
    expect(result.current.errorMsg).toBeNull();
  });

  it("starts in purchased state when initialPurchased is true", () => {
    const { result } = renderHook(() => usePurchase(true));
    expect(result.current.state).toBe("purchased");
  });

  it("transitions to purchased on successful record", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "recorded", id: 1 }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => usePurchase());
    await act(() => result.current.record("mbid-1", 999, "USD"));

    expect(result.current.state).toBe("purchased");
    expect(fetch).toHaveBeenCalledWith("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumMbid: "mbid-1",
        price: 999,
        currency: "USD",
      }),
    });
  });

  it("transitions to error on failed record", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    );

    const { result } = renderHook(() => usePurchase());
    await act(() => result.current.record("mbid-1", 999, "USD"));

    expect(result.current.state).toBe("error");
    expect(result.current.errorMsg).toBe("Server error");
  });

  it("transitions to idle on successful remove", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "removed" }), { status: 200 })
    );

    const { result } = renderHook(() => usePurchase(true));
    await act(() => result.current.remove("mbid-1"));

    expect(result.current.state).toBe("idle");
    expect(fetch).toHaveBeenCalledWith("/api/purchases/mbid-1", {
      method: "DELETE",
    });
  });

  it("transitions to error on failed remove", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );

    const { result } = renderHook(() => usePurchase());
    await act(() => result.current.remove("mbid-1"));

    expect(result.current.state).toBe("error");
    expect(result.current.errorMsg).toBe("Not found");
  });

  it("resets state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "fail" }), { status: 500 })
    );

    const { result } = renderHook(() => usePurchase());
    await act(() => result.current.record("mbid-1", 999, "USD"));
    expect(result.current.state).toBe("error");

    act(() => result.current.reset());
    expect(result.current.state).toBe("idle");
    expect(result.current.errorMsg).toBeNull();
  });
});
