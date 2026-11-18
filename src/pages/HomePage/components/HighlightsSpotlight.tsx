import { useState } from "react";
import type { Highlight } from "@/types";
import type { HighlightHandlers } from "../types";
import HighlightCard from "./HighlightCard";
import HighlightTile from "./HighlightTile";

interface HighlightsSpotlightProps {
  highlights: Highlight[];
  handlers: HighlightHandlers;
}

/** Desktop: the top highlight large, the rest waiting beside it. */
export default function HighlightsSpotlight({
  highlights,
  handlers,
}: HighlightsSpotlightProps) {
  const [featuredKey, setFeaturedKey] = useState<string | null>(null);
  const featured =
    highlights.find((highlight) => highlight.key === featuredKey) ??
    highlights[0];
  const waiting = highlights.filter(
    (highlight) => highlight.key !== featured.key
  );

  return (
    <div className="grid grid-cols-3 gap-4 h-72">
      <div
        key={featured.key}
        className={`min-h-0 animate-pop ${waiting.length > 0 ? "col-span-2" : "col-span-3"}`}
      >
        <HighlightCard highlight={featured} handlers={handlers} layout="row" />
      </div>

      {waiting.length > 0 && (
        <ul
          aria-label="More highlights"
          className="flex flex-col gap-3 min-h-0"
        >
          {waiting.map((highlight) => (
            <li key={highlight.key}>
              <HighlightTile
                highlight={highlight}
                onSelect={(selected) => setFeaturedKey(selected.key)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
