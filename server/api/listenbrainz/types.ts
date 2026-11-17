export type ListenBrainzSimilarArtist = {
  artist_mbid: string;
  name: string;
  comment: string;
  type: string | null;
  gender: string | null;
  score: number;
  reference_mbid: string;
};
