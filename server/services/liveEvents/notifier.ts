import {
  listUsersWithResolvedFollows,
  markNotified,
} from "../../db/liveEvents";
import type { HydratedLiveEvent } from "../../db/liveEvents";
import {
  deleteUnfollowedArtistStates,
  listArtistStates,
  saveArtistState,
} from "../../db/liveArtistState";
import type { UserLiveArtistState } from "../../db/index";
import { notifyLiveStatusChange, notifyTourUpdate } from "../notifications";
import { decideBaseline, snapshotOf } from "./baseline";
import { listUserTours, STATUS_NEWS_DAYS } from "./tours";
import type { ArtistTour, Origin } from "./tours";
import { createLogger } from "../../logger";

export type NotifyOutcome = {
  tours: number;
  statusChanges: number;
};

const log = createLogger("live-notifier");

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Venue, City", or the event name when JamBase gave neither. */
export function placeOf(event: HydratedLiveEvent): string {
  return (
    [event.venue_name, event.venue_city].filter(Boolean).join(", ") ||
    event.name
  );
}

function artistOf(event: HydratedLiveEvent): string {
  const lead = event.performers.find((performer) => performer.is_headliner);
  return lead?.artist_name ?? event.performers[0]?.artist_name ?? event.name;
}

/**
 * A show the user marked going changed, recently, and they have not been told
 * since. Gating on `notified_at` keeps one change from firing on every poll.
 */
export function hasUnsentStatusChange(
  event: HydratedLiveEvent,
  now: number
): boolean {
  if (event.state?.response !== "going") return false;
  if (event.event_status === "scheduled" || !event.status_changed_at) {
    return false;
  }
  const changedAt = Date.parse(event.status_changed_at);
  if (Number.isNaN(changedAt) || now - changedAt > STATUS_NEWS_DAYS * DAY_MS) {
    return false;
  }
  const notifiedAt = event.state.notified_at;
  return !notifiedAt || changedAt > Date.parse(notifiedAt);
}

async function applyTour(
  userId: number,
  tour: ArtistTour,
  state: UserLiveArtistState | undefined,
  origin: Origin | null,
  at: string
): Promise<boolean> {
  const action = decideBaseline(tour, state, origin);
  if (action === "keep") return false;

  const snapshot = snapshotOf(tour, origin, at);
  if (action === "record" || !tour.closest) {
    await saveArtistState(userId, tour.artistMbid, snapshot);
    return false;
  }

  await saveArtistState(userId, tour.artistMbid, {
    ...snapshot,
    notified_at: at,
    dismissed_at: null,
  });
  await notifyTourUpdate({
    userId,
    artistName: tour.artistName,
    artistMbid: tour.artistMbid,
    change: state?.closest_event_id === null ? "announced" : "closer",
    dateCount: tour.dates.length,
    place: placeOf(tour.closest),
    eventDate: tour.closest.event_date,
    distanceKm: tour.distanceKm,
  });
  return true;
}

async function notifyStatusChanges(
  userId: number,
  events: readonly HydratedLiveEvent[],
  now: number,
  at: string
): Promise<number> {
  let sent = 0;
  for (const event of events) {
    if (!hasUnsentStatusChange(event, now)) continue;
    if (event.event_status === "scheduled") continue;
    await notifyLiveStatusChange({
      userId,
      artistName: artistOf(event),
      place: placeOf(event),
      eventDate: event.event_date,
      status: event.event_status,
    });
    await markNotified(userId, event.id, at);
    sent += 1;
  }
  return sent;
}

async function notifyOneUser(
  userId: number,
  now: number,
  at: string,
  outcome: NotifyOutcome
): Promise<void> {
  const [{ origin, tours, events }, states] = await Promise.all([
    listUserTours(userId, now),
    listArtistStates(userId),
  ]);
  const byMbid = new Map(states.map((state) => [state.artist_mbid, state]));

  for (const tour of tours) {
    const sent = await applyTour(
      userId,
      tour,
      byMbid.get(tour.artistMbid),
      origin,
      at
    );
    if (sent) outcome.tours += 1;
  }
  outcome.statusChanges += await notifyStatusChanges(userId, events, now, at);
}

/**
 * Runs after each sweep. One notification per artist at most, and only when
 * the artist went from no dates to dates or added a closer one; see
 * `decideBaseline`.
 */
export async function notifyLiveUpdates(
  now: number = Date.now()
): Promise<NotifyOutcome> {
  const outcome: NotifyOutcome = { tours: 0, statusChanges: 0 };
  await deleteUnfollowedArtistStates();
  const userIds = await listUsersWithResolvedFollows();
  const at = new Date(now).toISOString();

  for (const userId of userIds) {
    try {
      await notifyOneUser(userId, now, at, outcome);
    } catch (error) {
      log.error(`Could not notify user ${userId}`, error);
    }
  }

  if (outcome.tours || outcome.statusChanges) {
    log.info(
      `Notified ${outcome.tours} tour update(s) and ${outcome.statusChanges} status change(s)`
    );
  }
  return outcome;
}
