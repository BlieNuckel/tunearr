import type { AlbumLibraryState } from "@shared/albumLibrary";
import { formatRelativeReleaseDate } from "@/utils/relativeDate";
import type {
  Highlight,
  LiveEventStatus,
  LiveHighlight,
  ReleaseHighlight,
  ReleaseLidarrStatus,
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

export function headliner(highlight: LiveHighlight): string {
  const lead = highlight.performers.find((performer) => performer.isHeadliner);
  return lead?.name ?? highlight.performers[0]?.name ?? highlight.name;
}

function liveTone(status: LiveEventStatus): HighlightTone {
  if (status === "cancelled") return "alert";
  return status === "scheduled" ? "live" : "warning";
}

/** "near you" is wrong for a show in another country, so the tier picks the wording. */
function liveEyebrow(highlight: LiveHighlight): string {
  const status = STATUS_EYEBROWS[highlight.status];
  if (status) return status;
  if (highlight.reason === "just-announced") return "Just announced";
  return highlight.tier === "local" ? "Live near you" : "Live within reach";
}

function placeLine(highlight: LiveHighlight): string {
  const parts = [highlight.venueName, highlight.venueCity].filter(Boolean);
  if (highlight.tier !== "local" && highlight.venueCountry) {
    parts.push(highlight.venueCountry);
  }
  const place = parts.join(", ");
  if (highlight.tier !== "local" || highlight.distanceKm === null) return place;
  const distance = `${Math.round(highlight.distanceKm)} km away`;
  return place ? `${place} · ${distance}` : distance;
}

function describeLive(highlight: LiveHighlight): HighlightView {
  const place = placeLine(highlight);
  const moved =
    highlight.status === "rescheduled" && highlight.previousStartDate
      ? `Moved from ${formatDate(highlight.previousStartDate, SHORT_DATE_FORMAT)}`
      : null;
  return {
    eyebrow: liveEyebrow(highlight),
    tone: liveTone(highlight.status),
    title: headliner(highlight),
    subtitle: formatDate(highlight.eventDate, EVENT_DATE_FORMAT),
    details: [place, moved].filter((line): line is string => Boolean(line)),
    artworkUrl: highlight.imageUrl,
    artworkAlt: highlight.name,
    artworkKind: "photo",
    library: null,
  };
}

/** Everything a highlight card shows, worked out once for every layout. */
export function describeHighlight(
  highlight: Highlight,
  now: number = Date.now()
): HighlightView {
  return highlight.kind === "release"
    ? describeRelease(highlight, now)
    : describeLive(highlight);
}
