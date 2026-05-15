export type AppleMusicResult = {
  wrapperType: string;
  artistId?: number;
  artistName?: string;
  artistLinkUrl?: string;
  collectionId?: number;
  collectionName?: string;
  collectionType?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
};

export type AppleSearchResponse = {
  resultCount: number;
  results: AppleMusicResult[];
};

export type AppleAlbum = {
  collectionId: number;
  collectionName: string;
  releaseDate?: string;
  collectionType?: string;
  artistName?: string;
};
