import { useRef } from "react";
import type { Highlight } from "@/types";
import useCarouselIndex from "../useCarouselIndex";
import type { HighlightHandlers } from "../types";
import HighlightCard from "./HighlightCard";

interface HighlightsCarouselProps {
  highlights: Highlight[];
  handlers: HighlightHandlers;
}

/**
 * Mobile: one highlight per slide. Slides are narrower than the track so the
 * next one peeks in and says there is more to swipe to.
 */
export default function HighlightsCarousel({
  highlights,
  handlers,
}: HighlightsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { activeIndex, onScroll, scrollTo } = useCarouselIndex(
    trackRef,
    highlights.length
  );
  const single = highlights.length === 1;

  return (
    <div role="group" aria-roledescription="carousel" aria-label="Highlights">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory overlay-scrollbar pb-2 pr-1"
      >
        {highlights.map((highlight, index) => (
          <div
            key={highlight.key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${highlights.length}`}
            className={`shrink-0 snap-start ${single ? "w-full" : "w-[85%]"}`}
          >
            <HighlightCard
              highlight={highlight}
              handlers={handlers}
              layout="stack"
            />
          </div>
        ))}
      </div>

      {!single && (
        <div className="mt-1 flex justify-center">
          {highlights.map((highlight, index) => (
            <button
              key={highlight.key}
              type="button"
              aria-label={`Show highlight ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => scrollTo(index)}
              className="p-1.5"
            >
              <span
                className={`block h-2.5 rounded-full border-2 border-black transition-all ${
                  index === activeIndex
                    ? "w-6 bg-black dark:bg-white"
                    : "w-2.5 bg-white dark:bg-gray-700"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
