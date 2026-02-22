export type MusicBrainzReleaseGroup = {
  id: string;
  score: number;
  title: string;
  "primary-type": string;
  "first-release-date": string;
  "artist-credit": Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  "secondary-types"?: string[];
};

export type MusicBrainzSearchResponse = {
  "release-groups": MusicBrainzReleaseGroup[];
  count: number;
  offset: number;
};

export type MusicBrainzArtistSearchResponse = {
  artists: { id: string; name: string }[];
};

export type MusicBrainzTrack = {
  position: number;
  title: string;
  length: number | null;
  recording: { title: string };
};

export type MusicBrainzMedium = {
  position: number;
  format: string;
  title: string;
  tracks: MusicBrainzTrack[];
};

export type MusicBrainzReleasesResponse = {
  releases: { media: MusicBrainzMedium[] }[];
};

export type ReleaseGroupSearchResult = {
  "release-groups": MusicBrainzReleaseGroup[];
  count: number;
  offset: number;
};

export type TrackMedia = {
  position: number;
  format: string;
  title: string;
  tracks: { position: number; title: string; length: number | null }[];
};

export type MusicBrainzRelease = {
  id: string;
  title: string;
  "release-group": {
    id: string;
    title: string;
  };
};
