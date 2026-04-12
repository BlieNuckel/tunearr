import { renderHook, act } from "@testing-library/react";
import usePurchaseContext from "../usePurchaseContext";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

const buyResponse = {
  recommendation: "buy",
  signals: [
    {
      factor: "label",
      recommendation: "buy",
      reason: "Warp Records is not on your blocklist",
    },
  ],
  label: { name: "Warp Records", mbid: "label-warp" },
};

function sseResponse(events: { event: string; data: unknown }[]) {
  const text =
    events
      .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}`)
      .join("\n\n") + "\n\n";

  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("usePurchaseContext", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => usePurchaseContext());
    expect(result.current.context).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it("fetches purchase context from SSE stream", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      sseResponse([
        { event: "progress", data: { step: "Looking up album details" } },
        { event: "result", data: buyResponse },
      ])
    );

    const { result } = renderHook(() => usePurchaseContext());
    await act(() => result.current.fetchContext("rg-123"));

    expect(fetch).toHaveBeenCalledWith(
      "/api/musicbrainz/purchase-context/rg-123"
    );
    expect(result.current.context).toEqual(buyResponse);
    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it("sets context to null on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("error", { status: 500 })
    );

    const { result } = renderHook(() => usePurchaseContext());
    await act(() => result.current.fetchContext("rg-bad"));

    expect(result.current.context).toBeNull();
  });

  it("sets context to null on fetch error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => usePurchaseContext());
    await act(() => result.current.fetchContext("rg-fail"));

    expect(result.current.context).toBeNull();
  });

  it("reset clears context and progress", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      sseResponse([{ event: "result", data: buyResponse }])
    );

    const { result } = renderHook(() => usePurchaseContext());
    await act(() => result.current.fetchContext("rg-123"));
    expect(result.current.context).toEqual(buyResponse);

    act(() => result.current.reset());
    expect(result.current.context).toBeNull();
    expect(result.current.progress).toBeNull();
  });
});
