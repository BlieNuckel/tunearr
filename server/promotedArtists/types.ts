export type PromotedArtist = {
  name: string;
  mbid: string;
  imageUrl: string;
  /** 0-1 similarity score from Last.fm, when available */
  match?: number;
  inLibrary: boolean;
};

export type PromotedArtistsResult = {
  artists: PromotedArtist[];
  seedArtists: string[];
} | null;
