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

export interface ArtistDetails {
  mbid: string;
  name: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  imageUrl?: string;
}

export interface ArtistSearchResult {
  mbid: string;
  name: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  imageUrl?: string;
}

export interface AlbumDetails {
  mbid: string;
  title: string;
  artistName: string;
  artistMbid: string | null;
  firstReleaseDate: string | null;
  primaryType: string | null;
  secondaryTypes: string[];
  label: { name: string; mbid: string } | null;
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

export type LidarrLifecycleStatus =
  | "downloading"
  | "wanted"
  | "imported"
  | "failed";

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
  month: number;
  allTime: number;
  albumCount: number;
}

export type MonitorState =
  | "idle"
  | "adding"
  | "success"
  | "already_monitored"
  | "error";

export type ReleaseNotificationSource = "musicbrainz" | "deezer" | "apple";

export interface FollowedArtistItem {
  id: number;
  artistMbid: string;
  artistName: string;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface SeenReleaseItem {
  id: number;
  followedArtistId: number;
  artistMbid: string;
  artistName: string;
  releaseKey: string;
  source: ReleaseNotificationSource;
  albumTitle: string;
  releaseDate: string | null;
  externalId: string | null;
  notifiedAt: string;
}
