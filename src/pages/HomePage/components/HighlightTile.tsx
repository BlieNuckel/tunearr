import type { Highlight } from "@/types";
import { describeHighlight } from "../highlightView";
import HighlightArtwork from "./HighlightArtwork";
import HighlightEyebrow from "./HighlightEyebrow";
import useCardSurface from "../useCardSurface";
import { TONE_SURFACE } from "../styles";

interface HighlightTileProps {
  highlight: Highlight;
  onSelect: (highlight: Highlight) => void;
}

/** A waiting highlight beside the featured one; choosing it brings it forward. */
export default function HighlightTile({
  highlight,
  onSelect,
}: HighlightTileProps) {
  const view = describeHighlight(highlight);
  const surface = useCardSurface(view, TONE_SURFACE[view.tone]);

  return (
    <button
      type="button"
      onClick={() => onSelect(highlight)}
      aria-label={`Show ${view.eyebrow}: ${view.title}`}
      style={surface.style}
      className={`w-full h-[5.5rem] flex items-center gap-3 p-2 text-left rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all ${surface.className}`}
    >
      <HighlightArtwork
        view={view}
        className="h-full aspect-square shrink-0 rounded-lg border-2 border-black"
      />
      <div className="min-w-0 flex flex-col">
        <HighlightEyebrow label={view.eyebrow} tone={view.tone} size="sm" />
        <span className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {view.title}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {view.subtitle}
        </span>
      </div>
    </button>
  );
}
