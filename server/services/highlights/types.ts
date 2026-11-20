import type { SerializedLiveEvent } from "../liveEvents/serialize";

export type HighlightKind = "release" | "live" | "request";

export type ReleaseLidarrStatus = "downloading" | "wanted" | "imported";

export type ReleaseHighlight = {
  kind: "release";
  key: string;
  followedReleaseId: number;
  releaseGroupMbid: string | null;
  title: string;
  artistName: string;
  artistMbid: string;
  releaseDate: string;
  releaseType: string | null;
  coverUrl: string | null;
  lidarrStatus: ReleaseLidarrStatus | null;
  unseen: boolean;
};

/** One followed artist on tour. `id` is the baseline row, which dismissal targets. */
export type LiveHighlight = {
  kind: "live";
  key: string;
  id: number;
  artistMbid: string;
  artistName: string;
  /** Upcoming dates still on. */
  dateCount: number;
  /** Closest to the user, or the soonest without a location. Null when only `change` is news. */
  closest: SerializedLiveEvent | null;
  distanceKm: number | null;
  hasLocation: boolean;
  /** When the user was last told about new or closer dates. */
  notifiedAt: string | null;
  /** A show they marked going that was recently cancelled, postponed or moved. */
  change: SerializedLiveEvent | null;
};

/** An album the user asked for that is now in the library. */
export type RequestHighlight = {
  kind: "request";
  key: string;
  requestId: number;
  albumMbid: string;
  title: string;
  artistName: string;
  coverUrl: string;
  availableAt: string;
};

export type Highlight = ReleaseHighlight | LiveHighlight | RequestHighlight;

/**
 * Where a highlight sits before anything else is compared. Lower comes first.
 * `urgent` is news that changes plans (a cancelled show); `fresh` is news the
 * user has not acted on and would want to hear first; `standing` is still true
 * but no longer new.
 */
export type HighlightTier = 0 | 1 | 2;

export type RankedHighlight<T extends Highlight = Highlight> = {
  highlight: T;
  tier: HighlightTier;
  /** ISO timestamp the highlight became news; newer wins within a tier. */
  at: string;
};

export type HighlightsResult = {
  items: Highlight[];
};
