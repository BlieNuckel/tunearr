export interface ReleaseGroup {
  id: string;
  title?: string;
  "first-release-date"?: string;
  "artist-credit"?: Array<{ artist?: { name?: string } }>;
  [key: string]: unknown;
}

export interface QueueItem {
  id: number;
  artist: string;
  album: string;
  status: string;
  [key: string]: unknown;
}

export interface WantedItem {
  id: number;
  artist: string;
  album: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
}

export type MonitorState = "idle" | "adding" | "success" | "already_monitored" | "error";
