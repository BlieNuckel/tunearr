import type { UserLiveArtistState } from "../../db/index";
import type { ArtistStateSnapshot } from "../../db/liveArtistState";
import type { ArtistTour, Origin } from "./tours";

/**
 * - `record`: store the current closest date silently.
 * - `notify`: store it and tell the user.
 * - `keep`: nothing they know about has changed.
 */
export type BaselineAction = "record" | "notify" | "keep";

export function snapshotOf(
  tour: ArtistTour,
  origin: Origin | null,
  at: string
): ArtistStateSnapshot {
  return {
    closest_event_id: tour.closest?.id ?? null,
    closest_distance_km: tour.distanceKm,
    origin_lat: origin?.lat ?? null,
    origin_lon: origin?.lon ?? null,
    evaluated_at: at,
  };
}

function originMoved(
  state: UserLiveArtistState,
  origin: Origin | null
): boolean {
  return (
    (state.origin_lat ?? null) !== (origin?.lat ?? null) ||
    (state.origin_lon ?? null) !== (origin?.lon ?? null)
  );
}

/**
 * Compares a tour with what the user already knows about it (#408):
 *
 * - Never checked (rollout, a new follow): record silently.
 * - Checked with no dates, now has dates: notify. This is the main case.
 * - The user moved: re-record silently, since every distance changed at once.
 * - The known closest date passed or was cancelled: re-record silently.
 * - A date closer than the known closest, by any margin: notify.
 *
 * Without a location nothing can be closer, so only the first dates notify.
 */
export function decideBaseline(
  tour: ArtistTour,
  state: UserLiveArtistState | undefined,
  origin: Origin | null
): BaselineAction {
  if (!state) return "record";

  if (!tour.closest) {
    return state.closest_event_id === null ? "keep" : "record";
  }
  if (state.closest_event_id === null) return "notify";
  if (originMoved(state, origin)) return "record";

  const known = tour.dates.some((date) => date.id === state.closest_event_id);
  if (!known) return "record";

  if (
    tour.distanceKm !== null &&
    state.closest_distance_km !== null &&
    tour.distanceKm < state.closest_distance_km
  ) {
    return "notify";
  }
  return "keep";
}
