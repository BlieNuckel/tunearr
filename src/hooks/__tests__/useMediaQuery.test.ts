import { renderHook, act } from "@testing-library/react";
import useMediaQuery from "../useMediaQuery";

type ChangeListener = () => void;

function mockMatchMedia(initial: Record<string, boolean>) {
  const state = { ...initial };
  const listeners = new Map<string, ChangeListener[]>();
  const spy = vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return state[query] ?? false;
        },
        addEventListener: (_event: string, cb: ChangeListener) => {
          listeners.set(query, [...(listeners.get(query) ?? []), cb]);
        },
        removeEventListener: (_event: string, cb: ChangeListener) => {
          listeners.set(
            query,
            (listeners.get(query) ?? []).filter((l) => l !== cb)
          );
        },
      }) as never
  );
  return {
    spy,
    set(query: string, matches: boolean) {
      state[query] = matches;
      (listeners.get(query) ?? []).forEach((cb) => cb());
    },
    listenerCount(query: string) {
      return listeners.get(query)?.length ?? 0;
    },
  };
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports whether the query matches", () => {
    mockMatchMedia({ "(min-width: 1024px)": true });

    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    expect(result.current).toBe(true);
  });

  it("updates when the viewport changes", () => {
    const media = mockMatchMedia({ "(min-width: 1024px)": false });
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(false);

    act(() => media.set("(min-width: 1024px)", true));

    expect(result.current).toBe(true);
  });

  it("follows a new query and stops listening to the old one", () => {
    const media = mockMatchMedia({ "(a)": true, "(b)": false });
    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: "(a)" } }
    );
    expect(result.current).toBe(true);

    rerender({ query: "(b)" });

    expect(result.current).toBe(false);
    expect(media.listenerCount("(a)")).toBe(0);
    expect(media.listenerCount("(b)")).toBe(1);
  });
});
