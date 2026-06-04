export type PlexSection = {
  key: string;
  type: string;
  title: string;
};

export type PlexArtistMetadata = {
  title: string;
  viewCount: number;
  thumb: string;
  Genre: { tag: string }[];
};

export type PlexSectionsResponse = {
  MediaContainer: { Directory: PlexSection[] };
};

export type PlexArtistsResponse = {
  MediaContainer: { Metadata: PlexArtistMetadata[] };
};

export type PlexHistoryMetadata = {
  grandparentTitle?: string;
  grandparentThumb?: string;
  viewedAt: number;
};

export type PlexHistoryResponse = {
  MediaContainer: { Metadata?: PlexHistoryMetadata[] };
};

export type TopArtistsRange = "all" | "4weeks" | "6months" | "12months";

export type PlexTopArtist = {
  name: string;
  viewCount: number;
  thumb: string;
  genres: string[];
};
