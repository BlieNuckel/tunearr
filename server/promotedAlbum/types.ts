export type TraceArtistTagContribution = {
  tagName: string;
  rawCount: number;
  weight: number;
};

export type TraceArtistEntry = {
  name: string;
  viewCount: number;
  picked: boolean;
  tagContributions: TraceArtistTagContribution[];
};

export type TraceWeightedTag = {
  name: string;
  weight: number;
  fromArtists: string[];
};

export type TraceAlbumPoolInfo = {
  page1Count: number;
  deepPage: number;
  deepPageCount: number;
  totalAfterDedup: number;
};

export type TraceSelectionReason =
  | "preferred_non_library"
  | "fallback_in_library";

export type RecommendationTrace = {
  plexArtists: TraceArtistEntry[];
  weightedTags: TraceWeightedTag[];
  chosenTag: { name: string; weight: number };
  albumPool: TraceAlbumPoolInfo;
  selectionReason: TraceSelectionReason;
};

export type PromotedAlbumResult = {
  album: {
    name: string;
    mbid: string;
    artistName: string;
    artistMbid: string;
    coverUrl: string;
  };
  tag: string;
  inLibrary: boolean;
  trace: RecommendationTrace;
} | null;
