import { Link } from "react-router-dom";
import useHaptics from "@/hooks/useHaptics";
import { TicketIcon } from "@/components/icons";
import type {
  Highlight,
  LiveHighlight,
  ReleaseHighlight,
  RequestHighlight,
} from "@/types";
import {
  albumNavState,
  albumPreviewFromReleaseHighlight,
  albumPreviewFromRequestHighlight,
  type NavPreviewState,
} from "@/utils/navPreview";
import { artistTourPath } from "@/utils/artistTour";
import { liveEventOf } from "../highlightView";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, TICKET_BUTTON } from "../styles";
import type { HighlightHandlers } from "../types";

interface HighlightActionsProps {
  highlight: Highlight;
  handlers: HighlightHandlers;
}

function releaseHref(highlight: ReleaseHighlight): string {
  if (highlight.releaseGroupMbid) return `/album/${highlight.releaseGroupMbid}`;
  const query = `${highlight.artistName} ${highlight.title}`.trim();
  return `/search?q=${encodeURIComponent(query)}`;
}

function releaseState(
  highlight: ReleaseHighlight
): NavPreviewState | undefined {
  if (!highlight.releaseGroupMbid) return undefined;
  return albumNavState(
    albumPreviewFromReleaseHighlight({
      ...highlight,
      releaseGroupMbid: highlight.releaseGroupMbid,
    })
  );
}

function ReleaseActions({
  highlight,
  handlers,
}: {
  highlight: ReleaseHighlight;
  handlers: HighlightHandlers;
}) {
  const haptics = useHaptics();
  return (
    <Link
      to={releaseHref(highlight)}
      state={releaseState(highlight)}
      onClick={() => {
        haptics.light();
        handlers.onOpenRelease(highlight);
      }}
      className={PRIMARY_BUTTON}
    >
      {highlight.releaseGroupMbid ? "View album" : "Find album"}
    </Link>
  );
}

function RequestActions({ highlight }: { highlight: RequestHighlight }) {
  const haptics = useHaptics();
  return (
    <Link
      to={`/album/${highlight.albumMbid}`}
      state={albumNavState(albumPreviewFromRequestHighlight(highlight))}
      onClick={() => haptics.light()}
      className={PRIMARY_BUTTON}
    >
      View album
    </Link>
  );
}

function LiveActions({
  highlight,
  handlers,
}: {
  highlight: LiveHighlight;
  handlers: HighlightHandlers;
}) {
  const haptics = useHaptics();
  const event = liveEventOf(highlight);

  // Nothing to buy or attend for a cancelled show; the only thing left to do
  // is acknowledge it.
  if (highlight.change?.status === "cancelled") {
    return (
      <button
        type="button"
        onClick={() => {
          haptics.light();
          handlers.onDismiss(highlight);
        }}
        className={SECONDARY_BUTTON}
      >
        Got it
      </button>
    );
  }

  return (
    <>
      {event.ticketUrl && (
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={TICKET_BUTTON}
        >
          <TicketIcon className="w-4 h-4" aria-hidden="true" />
          Tickets
        </a>
      )}
      <Link
        to={artistTourPath(highlight.artistMbid)}
        onClick={() => haptics.light()}
        className={SECONDARY_BUTTON}
      >
        All dates
      </Link>
      {!highlight.change && event.response !== "going" && (
        <button
          type="button"
          onClick={() => {
            haptics.light();
            handlers.onGoing(highlight);
          }}
          className={SECONDARY_BUTTON}
        >
          Going
        </button>
      )}
    </>
  );
}

export default function HighlightActions({
  highlight,
  handlers,
}: HighlightActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {highlight.kind === "release" && (
        <ReleaseActions highlight={highlight} handlers={handlers} />
      )}
      {highlight.kind === "request" && <RequestActions highlight={highlight} />}
      {highlight.kind === "live" && (
        <LiveActions highlight={highlight} handlers={handlers} />
      )}
    </div>
  );
}
