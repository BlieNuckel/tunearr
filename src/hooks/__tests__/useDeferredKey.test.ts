import { renderHook } from "@testing-library/react";
import useDeferredKey from "../useDeferredKey";

describe("useDeferredKey", () => {
  it("waits until ready", () => {
    const { result, rerender } = renderHook(
      ({ ready }: { ready: boolean }) => useDeferredKey("rg-1", ready),
      { initialProps: { ready: false } }
    );
    expect(result.current).toBeNull();

    rerender({ ready: true });
    expect(result.current).toBe("rg-1");
  });

  it("stays on once started, even if the page stops being ready", () => {
    const { result, rerender } = renderHook(
      ({ ready }: { ready: boolean }) => useDeferredKey("rg-1", ready),
      { initialProps: { ready: true } }
    );

    rerender({ ready: false });
    expect(result.current).toBe("rg-1");
  });

  it("waits again for a new key", () => {
    const { result, rerender } = renderHook(
      ({ id, ready }: { id: string; ready: boolean }) =>
        useDeferredKey(id, ready),
      { initialProps: { id: "rg-1", ready: true } }
    );

    rerender({ id: "rg-2", ready: false });
    expect(result.current).toBeNull();

    rerender({ id: "rg-2", ready: true });
    expect(result.current).toBe("rg-2");
  });

  it("returns null without a key", () => {
    const { result } = renderHook(() => useDeferredKey(undefined, true));
    expect(result.current).toBeNull();
  });
});
