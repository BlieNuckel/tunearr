import { useMemo } from "react";
import useHighlights from "@/hooks/useHighlights";
import useMediaQuery from "@/hooks/useMediaQuery";
import SectionStatus from "@/components/SectionStatus";
import type { HighlightHandlers } from "../types";
import HighlightsCarousel from "./HighlightsCarousel";
import HighlightsEmpty from "./HighlightsEmpty";
import HighlightsSkeleton from "./HighlightsSkeleton";
import HighlightsSpotlight from "./HighlightsSpotlight";

export const DESKTOP_QUERY = "(min-width: 1024px)";

export default function Highlights() {
  const {
    highlights,
    loading,
    error,
    errorKind,
    retrying,
    refresh,
    dismiss,
    markGoing,
    markSeen,
  } = useHighlights();
  const desktop = useMediaQuery(DESKTOP_QUERY);

  const handlers = useMemo<HighlightHandlers>(
    () => ({
      onDismiss: (highlight) => void dismiss(highlight),
      onGoing: (highlight) => void markGoing(highlight),
      onOpenRelease: markSeen,
    }),
    [dismiss, markGoing, markSeen]
  );

  let body;
  if (highlights === null) {
    body =
      loading || retrying ? (
        <HighlightsSkeleton desktop={desktop} />
      ) : (
        <SectionStatus
          subject="your highlights"
          error={error}
          errorKind={errorKind}
          retrying={retrying}
          onRetry={() => void refresh()}
        />
      );
  } else if (highlights.length === 0) {
    body = <HighlightsEmpty />;
  } else if (desktop) {
    body = <HighlightsSpotlight highlights={highlights} handlers={handlers} />;
  } else {
    body = <HighlightsCarousel highlights={highlights} handlers={handlers} />;
  }

  return (
    <section aria-labelledby="highlights-heading">
      <h2
        id="highlights-heading"
        className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400"
      >
        Highlights
      </h2>
      {body}
    </section>
  );
}
