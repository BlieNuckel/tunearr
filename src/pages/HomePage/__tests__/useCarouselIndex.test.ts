import { act, renderHook } from "@testing-library/react";
import useCarouselIndex from "../useCarouselIndex";

type Geometry = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  slides: { offsetLeft: number; offsetWidth: number }[];
};

function track(geometry: Geometry): HTMLElement {
  const element = document.createElement("div");
  for (const slide of geometry.slides) {
    const child = document.createElement("div");
    Object.defineProperty(child, "offsetLeft", { value: slide.offsetLeft });
    Object.defineProperty(child, "offsetWidth", { value: slide.offsetWidth });
    element.appendChild(child);
  }
  Object.defineProperty(element, "scrollWidth", {
    value: geometry.scrollWidth,
  });
  Object.defineProperty(element, "clientWidth", {
    value: geometry.clientWidth,
  });
  element.scrollLeft = geometry.scrollLeft;
  return element;
}

const THREE_SLIDES = [
  { offsetLeft: 0, offsetWidth: 300 },
  { offsetLeft: 312, offsetWidth: 300 },
  { offsetLeft: 624, offsetWidth: 300 },
];

function scrolledTo(scrollLeft: number) {
  return track({
    scrollLeft,
    scrollWidth: 928,
    clientWidth: 350,
    slides: THREE_SLIDES,
  });
}

function indexAfterScroll(element: HTMLElement, count = 3): number {
  const { result } = renderHook(() =>
    useCarouselIndex({ current: element }, count)
  );
  act(() => result.current.onScroll());
  return result.current.activeIndex;
}

describe("useCarouselIndex", () => {
  it("starts on the first slide", () => {
    const { result } = renderHook(() =>
      useCarouselIndex({ current: scrolledTo(0) }, 3)
    );
    expect(result.current.activeIndex).toBe(0);
  });

  it.each([
    [100, 0],
    [200, 1],
    [312, 1],
    [500, 2],
  ])("at %ipx shows slide %i", (scrollLeft, index) => {
    expect(indexAfterScroll(scrolledTo(scrollLeft))).toBe(index);
  });

  it("counts the end of the track as the last slide", () => {
    expect(indexAfterScroll(scrolledTo(928 - 350))).toBe(2);
  });

  it("stays on the first slide before layout has sizes", () => {
    const element = track({
      scrollLeft: 0,
      scrollWidth: 0,
      clientWidth: 0,
      slides: [
        { offsetLeft: 0, offsetWidth: 0 },
        { offsetLeft: 0, offsetWidth: 0 },
      ],
    });
    expect(indexAfterScroll(element, 2)).toBe(0);
  });

  it("keeps the index inside the slides after one goes away", () => {
    const element = scrolledTo(0);
    const { result, rerender } = renderHook(
      ({ count }) => useCarouselIndex({ current: element }, count),
      { initialProps: { count: 3 } }
    );
    act(() => result.current.scrollTo(2));

    rerender({ count: 2 });

    expect(result.current.activeIndex).toBe(1);
  });
});
