export type AppleMusicArtist = {
  artistId: number;
  artistName: string;
  artistLinkUrl: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
};

export type AppleSearchResponse = {
  resultCount: number;
  results: AppleMusicArtist[];
};
