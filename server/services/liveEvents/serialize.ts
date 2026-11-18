import type { HydratedLiveEvent } from "../../db/liveEvents";
import type { NoticeCandidate } from "./notice";

export function serializeLiveEvent(event: HydratedLiveEvent) {
  return {
    id: event.id,
    eventKey: event.event_key,
    name: event.name,
    eventDate: event.event_date,
    previousStartDate: event.previous_start_date,
    status: event.event_status,
    statusChangedAt: event.status_changed_at,
    venueName: event.venue_name,
    venueCity: event.venue_city,
    venueCountry: event.venue_country,
    ticketUrl: event.ticket_url,
    imageUrl: event.image_url,
    performers: event.performers.map((performer) => ({
      jambaseId: performer.artist_jambase_id,
      name: performer.artist_name,
      isHeadliner: performer.is_headliner,
    })),
    response: event.state?.response ?? null,
    viewedAt: event.state?.viewed_at ?? null,
  };
}

export type SerializedLiveEvent = ReturnType<typeof serializeLiveEvent>;

export function serializeNotice(candidate: NoticeCandidate) {
  return {
    ...serializeLiveEvent(candidate.event),
    tier: candidate.tier,
    reason: candidate.reason,
    distanceKm: candidate.distanceKm,
  };
}

export type SerializedNotice = ReturnType<typeof serializeNotice>;
