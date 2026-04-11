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
  previewUrl?: string;
}

export interface Medium {
  position: number;
  format: string;
  title: string;
  tracks: Track[];
}

export type RequestStatus = "pending" | "approved" | "declined";

export interface RequestUser {
  id: number;
  username: string;
  thumb: string | null;
}

export type LidarrLifecycleStatus = "downloading" | "wanted" | "imported";

export interface LidarrLifecycle {
  status: LidarrLifecycleStatus | null;
  downloadProgress: number | null;
  quality: string | null;
  sourceIndexer: string | null;
  lastEvent: { eventType: number; date: string } | null;
  lidarrAlbumId: number | null;
}

export interface RequestItem {
  id: number;
  albumMbid: string;
  artistName: string | null;
  albumTitle: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  user: RequestUser | null;
  lidarr: LidarrLifecycle | null;
}

export interface WantedItem {
  id: number;
  albumMbid: string;
  artistName: string;
  albumTitle: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: number;
  albumMbid: string;
  artistName: string;
  albumTitle: string;
  price: number;
  currency: string;
  purchasedAt: string;
}

export interface SpendingSummary {
  week: number;
  month: number;
  year: number;
  allTime: number;
}

export type MonitorState =
  | "idle"
  | "adding"
  | "success"
  | "already_monitored"
  | "error";
