export type AppleMusicResult = {
  wrapperType: string;
  artistId?: number;
  artistName?: string;
  artistLinkUrl?: string;
  collectionId?: number;
  collectionName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
};

export type AppleSearchResponse = {
  resultCount: number;
  results: AppleMusicResult[];
};
