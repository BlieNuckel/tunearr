import type { SerializedNotice } from "../liveEvents/serialize";

export type HighlightKind = "release" | "live";

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

export type LiveHighlight = SerializedNotice & {
  kind: "live";
  key: string;
};

export type Highlight = ReleaseHighlight | LiveHighlight;

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
