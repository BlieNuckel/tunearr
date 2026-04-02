import { renderHook, act } from "@testing-library/react";
import useIsMobile from "../useIsMobile";

type ChangeListener = () => void;

function createMockMediaQueryList(matches: boolean) {
  const listeners: ChangeListener[] = [];
  return {
    matches,
    addEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    triggerChange(newMatches: boolean) {
      this.matches = newMatches;
      listeners.forEach((cb) => cb());
    },
  };
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when viewport is below 640px", () => {
    const mql = createMockMediaQueryList(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql as never);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when viewport is at or above 640px", () => {
    const mql = createMockMediaQueryList(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql as never);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    const mql = createMockMediaQueryList(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql as never);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => {
      mql.triggerChange(false);
    });
    expect(result.current).toBe(false);
  });

  it("cleans up listener on unmount", () => {
    const mql = createMockMediaQueryList(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql as never);

    const { unmount } = renderHook(() => useIsMobile());
    expect(mql.addEventListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
