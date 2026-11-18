import { useCallback, useState, type RefObject } from "react";

/**
 * Which slide is in view. The distance between two slide starts is the step;
 * the last slide is narrower than the track can scroll, so reaching the end
 * counts as reaching it.
 */
function indexAt(track: HTMLElement, count: number): number {
  const slides = track.children;
  const first = slides[0] as HTMLElement | undefined;
  if (!first || first.offsetWidth === 0) return 0;

  if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 1) {
    return count - 1;
  }

  const second = slides[1] as HTMLElement | undefined;
  const step = second
    ? second.offsetLeft - first.offsetLeft
    : first.offsetWidth;
  if (step <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / step)));
}

export default function useCarouselIndex(
  trackRef: RefObject<HTMLElement | null>,
  count: number
) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (track) setActiveIndex(indexAt(track, count));
  }, [trackRef, count]);

  const scrollTo = useCallback(
    (index: number) => {
      const slide = trackRef.current?.children[index] as
        HTMLElement | undefined;
      slide?.scrollIntoView?.({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
      setActiveIndex(index);
    },
    [trackRef]
  );

  return {
    activeIndex: Math.max(0, Math.min(activeIndex, count - 1)),
    onScroll,
    scrollTo,
  };
}
