import useHaptics from "@/hooks/useHaptics";
import { XMarkIcon } from "@/components/icons";
import type { Highlight } from "@/types";
import { describeHighlight } from "../highlightView";
import { LIBRARY_PILL, TONE_SURFACE } from "../styles";
import type { HighlightHandlers, HighlightView } from "../types";
import useCardSurface from "../useCardSurface";
import HighlightActions from "./HighlightActions";
import HighlightArtwork from "./HighlightArtwork";
import HighlightEyebrow from "./HighlightEyebrow";

interface HighlightCardProps {
  highlight: Highlight;
  handlers: HighlightHandlers;
  /** `row` puts the artwork beside the text (desktop); `stack` above it (mobile). */
  layout: "row" | "stack";
}

const LAYOUT_CLASSES = {
  row: {
    article: "flex-row",
    artwork: "h-full aspect-square shrink-0 border-r-2 border-black",
    body: "p-6",
    title: "mt-3 text-3xl line-clamp-2",
    subtitle: "mt-1 text-lg",
  },
  stack: {
    article: "flex-col",
    artwork: "w-full aspect-[4/3] shrink-0 border-b-2 border-black",
    body: "p-4",
    title: "mt-2 text-xl line-clamp-2",
    subtitle: "mt-0.5 text-base",
  },
} as const;

function HighlightText({
  view,
  layout,
}: {
  view: HighlightView;
  layout: HighlightCardProps["layout"];
}) {
  const classes = LAYOUT_CLASSES[layout];
  return (
    <>
      <HighlightEyebrow label={view.eyebrow} tone={view.tone} />
      <h3
        className={`font-bold text-gray-900 dark:text-gray-100 pr-8 ${classes.title}`}
      >
        {view.title}
      </h3>
      <p
        className={`text-gray-800 dark:text-gray-200 truncate ${classes.subtitle}`}
      >
        {view.subtitle}
      </p>
      {view.details.map((line) => (
        <p
          key={line}
          className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate"
        >
          {line}
        </p>
      ))}
      {view.library && (
        <span
          className={`mt-2 self-start text-xs px-2 py-0.5 rounded-full border-2 border-black font-bold shadow-cartoon-sm ${LIBRARY_PILL[view.library.state]}`}
        >
          {view.library.label}
        </span>
      )}
    </>
  );
}

export default function HighlightCard({
  highlight,
  handlers,
  layout,
}: HighlightCardProps) {
  const haptics = useHaptics();
  const view = describeHighlight(highlight);
  const classes = LAYOUT_CLASSES[layout];
  const surface = useCardSurface(view, TONE_SURFACE[view.tone]);

  return (
    <article
      aria-label={`${view.eyebrow}: ${view.title}`}
      style={surface.style}
      className={`relative h-full flex overflow-hidden rounded-xl border-2 border-black shadow-cartoon-md transition-colors duration-500 ${surface.className} ${classes.article}`}
    >
      <HighlightArtwork view={view} className={classes.artwork} />

      <div className={`flex-1 min-w-0 flex flex-col ${classes.body}`}>
        <HighlightText view={view} layout={layout} />
        <div className="mt-auto pt-4">
          <HighlightActions highlight={highlight} handlers={handlers} />
        </div>
      </div>

      <button
        type="button"
        aria-label={`Dismiss ${view.title}`}
        onClick={() => {
          haptics.light();
          handlers.onDismiss(highlight);
        }}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg border-2 border-black bg-white text-black dark:bg-gray-700 dark:text-gray-100 shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
      >
        <XMarkIcon className="w-4 h-4" aria-hidden="true" />
      </button>
    </article>
  );
}
