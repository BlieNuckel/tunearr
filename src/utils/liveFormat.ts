import type { LiveEventStatus, LiveEventSummary } from "@/types";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};

export const STATUS_LABELS: Partial<Record<LiveEventStatus, string>> = {
  cancelled: "Cancelled",
  postponed: "Postponed",
  rescheduled: "Rescheduled",
};

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, DATE_FORMAT);
}

export function headliner(event: LiveEventSummary): string {
  const lead = event.performers.find((performer) => performer.isHeadliner);
  return lead?.name ?? event.performers[0]?.name ?? event.name;
}

/** "Amiralen, Malmö, SE": whichever of venue, city and country are known. */
export function venueLine(event: LiveEventSummary): string {
  return [event.venueName, event.venueCity, event.venueCountry]
    .filter(Boolean)
    .join(", ");
}

/** "Amiralen, Malmö, SE · Fri, 5 Sept 2026": where and when, in one line. */
export function whereAndWhen(event: LiveEventSummary): string {
  return [venueLine(event), formatDate(event.eventDate)]
    .filter(Boolean)
    .join(" · ");
}
