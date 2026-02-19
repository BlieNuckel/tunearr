export interface ReleaseGroup {
  id: string;
  score: number;
  title: string;
  "primary-type": string;
  "first-release-date": string;
  "artist-credit": Array<{
    name: string;
    artist: { id: string; name: string };
  }>;
  "secondary-types"?: string[];
}

export interface Track {
  position: number;
  title: string;
  length: number | null;
}

export interface Medium {
  position: number;
  format: string;
  title: string;
  tracks: Track[];
}

export interface QueueItem {
  id: number;
  status: string;
  title: string;
  size: number;
  sizeleft: number;
  trackedDownloadStatus: string;
  artist: { artistName: string };
  album: { title: string };
  quality: { quality: { name: string } };
}

export interface WantedItem {
  id: number;
  title: string;
  artist: { artistName: string };
}

export interface RecentImport {
  id: number;
  albumId: number;
  date: string;
  artist: {
    artistName: string;
    id: number;
  };
  album: {
    id: number;
    title: string;
  };
}

export type MonitorState =
  | "idle"
  | "adding"
  | "success"
  | "already_monitored"
  | "error";
