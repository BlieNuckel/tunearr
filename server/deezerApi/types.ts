export type DeezerArtist = {
  id: number;
  name: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
};

export type DeezerArtistSearchResponse = {
  data: DeezerArtist[];
  total: number;
};
