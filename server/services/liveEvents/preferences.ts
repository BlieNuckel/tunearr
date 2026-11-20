import { ApiError } from "../../middleware/ApiError";
import {
  getUserLivePreferences,
  setUserLivePreferences,
} from "../../db/liveEvents";
import type { UserLivePreferences } from "../../db/liveEvents";

/** Where a user's live dates are measured from, as they picked it. */
export type LiveLocation = {
  lat: number;
  lon: number;
  /** What they picked ("Malmö, Skåne, Sweden"); null for raw coordinates. */
  place: string | null;
};

export type LivePreferencesView = {
  location: LiveLocation | null;
};

export type LivePreferencesPatch = {
  location?: unknown;
};

const MAX_PLACE_LENGTH = 200;

function toView(prefs: UserLivePreferences): LivePreferencesView {
  if (prefs.live_lat === null || prefs.live_lon === null) {
    return { location: null };
  }
  return {
    location: {
      lat: prefs.live_lat,
      lon: prefs.live_lon,
      place: prefs.live_place,
    },
  };
}

function isCoordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

function parsePlace(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    throw new ApiError(400, "place must be text");
  }
  const place = raw.trim();
  return place === "" ? null : place.slice(0, MAX_PLACE_LENGTH);
}

/** Null clears the location; anything else must be a real coordinate. */
export function parseLocation(raw: unknown): LiveLocation | null {
  if (raw === null) return null;
  if (typeof raw !== "object") {
    throw new ApiError(400, "location must be { lat, lon, place } or null");
  }
  const { lat, lon, place } = raw as Record<string, unknown>;
  if (!isCoordinate(lat, 90) || !isCoordinate(lon, 180)) {
    throw new ApiError(400, "That is not a valid coordinate");
  }
  return { lat, lon, place: parsePlace(place) };
}

export async function readLivePreferences(
  userId: number
): Promise<LivePreferencesView> {
  const prefs = await getUserLivePreferences(userId);
  if (!prefs) throw new ApiError(404, "User not found");
  return toView(prefs);
}

/**
 * Only the location is per user now (#408): everyone sees every date, and
 * closeness is worked out from here.
 */
export async function writeLivePreferences(
  userId: number,
  patch: LivePreferencesPatch
): Promise<LivePreferencesView> {
  if (!patch || !("location" in patch)) {
    throw new ApiError(400, "Nothing to save: send a location or null");
  }
  const location = parseLocation(patch.location);

  await setUserLivePreferences(userId, {
    live_lat: location?.lat ?? null,
    live_lon: location?.lon ?? null,
    live_place: location?.place ?? null,
  });
  return readLivePreferences(userId);
}
