import type { AlbumLibraryState } from "@shared/albumLibrary";
import { formatRelativeReleaseDate } from "@/utils/relativeDate";
import type {
  Highlight,
  LiveEventStatus,
  LiveEventSummary,
  LiveHighlight,
  ReleaseHighlight,
  ReleaseLidarrStatus,
  RequestHighlight,
} from "@/types";
import type { HighlightTone, HighlightView } from "./types";

const RELEASE_EYEBROWS: Record<string, string> = {
  Album: "New album",
  EP: "New EP",
  Single: "New single",
};

const LIBRARY_STATES: Record<
  ReleaseLidarrStatus,
  { state: AlbumLibraryState; label: string }
> = {
  imported: { state: "complete", label: "In your library" },
  downloading: { state: "partial", label: "Downloading" },
  wanted: { state: "requested", label: "Requested" },
};

const STATUS_EYEBROWS: Partial<Record<LiveEventStatus, string>> = {
  cancelled: "Cancelled",
  postponed: "Postponed",
  rescheduled: "Rescheduled",
};

const EVENT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
};

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
};

function formatDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, options);
}

function releasedLine(releaseDate: string, now: number): string | null {
  const relative = formatRelativeReleaseDate(releaseDate, now);
  return relative ? `Released ${relative}` : null;
}

function describeRelease(
  highlight: ReleaseHighlight,
  now: number
): HighlightView {
  const released = releasedLine(highlight.releaseDate, now);
  return {
    eyebrow: RELEASE_EYEBROWS[highlight.releaseType ?? ""] ?? "New release",
    tone: "release",
    title: highlight.title,
    subtitle: highlight.artistName,
    details: released ? [released] : [],
    artworkUrl: highlight.coverUrl,
    artworkAlt: `${highlight.title} cover art`,
    artworkKind: "cover",
    library: highlight.lidarrStatus
      ? LIBRARY_STATES[highlight.lidarrStatus]
      : null,
  };
}

function describeRequest(
  highlight: RequestHighlight,
  now: number
): HighlightView {
  const added = formatRelativeReleaseDate(highlight.availableAt, now);
  return {
    eyebrow: "Your request is here",
    tone: "request",
    title: highlight.title,
    subtitle: highlight.artistName,
    details: added ? [`Added to your library ${added}`] : [],
    artworkUrl: highlight.coverUrl,
    artworkAlt: `${highlight.title} cover art`,
    artworkKind: "cover",
    library: null,
  };
}

/** Without a location the card can only lead with the next date, so it says how to fix that. */
const SET_LOCATION_HINT = "Set your location in Settings to see the closest";

/** How long new or closer dates count as news on the card. */
const NEW_DATES_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

function liveTone(status: LiveEventStatus): HighlightTone {
  if (status === "cancelled") return "alert";
  return status === "scheduled" ? "live" : "warning";
}

function liveEyebrow(highlight: LiveHighlight, now: number): string {
  const status = highlight.change && STATUS_EYEBROWS[highlight.change.status];
  if (status) return status;
  const notified = highlight.notifiedAt
    ? Date.parse(highlight.notifiedAt)
    : NaN;
  return now - notified < NEW_DATES_DAYS * DAY_MS
    ? "New tour dates"
    : "On tour";
}

function placeLine(event: LiveEventSummary, distanceKm: number | null): string {
  const place = [event.venueName, event.venueCity, event.venueCountry]
    .filter(Boolean)
    .join(", ");
  if (distanceKm === null) return place;
  const distance = `${Math.round(distanceKm)} km away`;
  return place ? `${place} · ${distance}` : distance;
}

/** Says whether the date shown is the closest or just the next one, and of how many. */
function tourLine(highlight: LiveHighlight): string {
  if (highlight.dateCount === 1) return "Only date announced";
  const which = highlight.distanceKm === null ? "Next" : "Closest";
  return `${which} of ${highlight.dateCount} dates`;
}

function movedLine(event: LiveEventSummary): string | null {
  if (event.status !== "rescheduled" || !event.previousStartDate) return null;
  return `Moved from ${formatDate(event.previousStartDate, SHORT_DATE_FORMAT)}`;
}

/** The date the card is about: the change to a show they are going to, else the closest. */
export function liveEventOf(highlight: LiveHighlight): LiveEventSummary {
  return (highlight.change ?? highlight.closest) as LiveEventSummary;
}

function describeLive(highlight: LiveHighlight, now: number): HighlightView {
  const event = liveEventOf(highlight);
  const details = highlight.change
    ? [placeLine(event, null), movedLine(event)]
    : [
        placeLine(event, highlight.distanceKm),
        tourLine(highlight),
        highlight.hasLocation ? null : SET_LOCATION_HINT,
      ];
  return {
    eyebrow: liveEyebrow(highlight, now),
    tone: highlight.change ? liveTone(highlight.change.status) : "live",
    title: highlight.artistName,
    subtitle: formatDate(event.eventDate, EVENT_DATE_FORMAT),
    details: details.filter((line): line is string => Boolean(line)),
    artworkUrl: event.imageUrl,
    artworkAlt: highlight.artistName,
    artworkKind: "photo",
    library: null,
  };
}

/** Everything a highlight card shows, worked out once for every layout. */
export function describeHighlight(
  highlight: Highlight,
  now: number = Date.now()
): HighlightView {
  if (highlight.kind === "release") return describeRelease(highlight, now);
  if (highlight.kind === "request") return describeRequest(highlight, now);
  return describeLive(highlight, now);
}
