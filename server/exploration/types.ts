import type { MusicBrainzReleaseGroup } from "../api/musicbrainz/types";

export type TagWeight = {
  name: string;
  count: number;
};

export type ExplorationSuggestion = {
  releaseGroup: MusicBrainzReleaseGroup;
  tag: string;
};

export type SuggestionsRequest = {
  artistName: string;
  albumName: string;
  albumMbid: string;
  excludeMbids: string[];
  accumulatedTags: TagWeight[];
};

export type SuggestionsResponse = {
  suggestions: ExplorationSuggestion[];
  newTags: TagWeight[];
};
