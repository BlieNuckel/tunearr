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

export interface AlbumLabel {
  name: string;
  mbid: string;
}

export interface AlbumDetails {
  mbid: string;
  title: string;
  artistName: string;
  artistMbid: string | null;
  firstReleaseDate: string | null;
  primaryType: string | null;
  secondaryTypes: string[];
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
  "downloading" | "wanted" | "imported" | "failed";

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

/** Totals in the user's own currency, with the limit they are measured against. All zero until a currency is chosen. */
export interface SpendingSummary {
  currency: string | null;
  monthlyLimit: number | null;
  month: number;
  allTime: number;
  albumCount: number;
}

export type MonitorState =
  "idle" | "adding" | "success" | "already_monitored" | "error";

/**
 * Whether live coverage for an artist is coming, working, or never going to
 * happen. "unavailable" means JamBase has never heard of them and the app will
 * not retry, so an empty date list is permanent rather than just current.
 */
export type LiveTrackingState = "pending" | "tracked" | "unavailable";

export type LiveRosterSummary = Record<LiveTrackingState, number>;

export interface FollowedArtistItem {
  id: number;
  artistMbid: string;
  artistName: string;
  lastCheckedAt: string | null;
  createdAt: string;
  liveTracking: LiveTrackingState;
}

export interface FollowedReleaseItem {
  id: number;
  followedArtistId: number;
  artistMbid: string;
  artistName: string;
  releaseKey: string;
  albumTitle: string;
  releaseDate: string | null;
  releaseGroupMbid: string | null;
  coverUrl: string | null;
  viewedAt: string | null;
  notifiedAt: string;
}

export type LiveEventStatus =
  "scheduled" | "rescheduled" | "postponed" | "cancelled";

export type LiveEventResponse = "going" | "dismissed";

export interface LiveEventPerformerSummary {
  jambaseId: string;
  name: string;
  isHeadliner: boolean;
}

export interface LiveEventSummary {
  id: number;
  eventKey: string;
  name: string;
  eventDate: string;
  previousStartDate: string | null;
  status: LiveEventStatus;
  statusChangedAt: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  distanceKm: number | null;
  performers: LiveEventPerformerSummary[];
  response: LiveEventResponse | null;
  viewedAt: string | null;
}

export type ReleaseLidarrStatus = "downloading" | "wanted" | "imported";

export interface ReleaseHighlight {
  kind: "release";
  key: string;
  followedReleaseId: number;
  releaseGroupMbid: string | null;
  title: string;
  artistName: string;
  artistMbid: string;
  releaseDate: string;
  releaseType: string | null;
  coverUrl: string | null;
  lidarrStatus: ReleaseLidarrStatus | null;
  unseen: boolean;
}

/** One followed artist on tour. `id` is what dismissal targets. */
export interface LiveHighlight {
  kind: "live";
  key: string;
  id: number;
  artistMbid: string;
  artistName: string;
  /** Upcoming dates still on. */
  dateCount: number;
  /** Closest to the user, or the soonest without a location. */
  closest: LiveEventSummary | null;
  distanceKm: number | null;
  hasLocation: boolean;
  /** When the user was last told about new or closer dates. */
  notifiedAt: string | null;
  /** A show they marked going that was recently cancelled, postponed or moved. */
  change: LiveEventSummary | null;
}

/** An album the user asked for that is now in the library. */
export interface RequestHighlight {
  kind: "request";
  key: string;
  requestId: number;
  albumMbid: string;
  title: string;
  artistName: string;
  coverUrl: string;
  availableAt: string;
}

export type Highlight = ReleaseHighlight | LiveHighlight | RequestHighlight;

export interface HighlightsData {
  items: Highlight[];
}

export interface LiveUserPreferences {
  live_radius_km: number | null;
  live_lat: number | null;
  live_lon: number | null;
  live_regions: string[] | null;
  live_announce_days: number | null;
  live_imminent_days_local: number | null;
  live_imminent_days_regional: number | null;
  live_banner_enabled: boolean | null;
}

export interface LiveCoverage {
  originLat: number | null;
  originLon: number | null;
  sweepRadiusKm: number;
  regions: string[];
  configured: boolean;
}

export interface LivePreferencesData {
  preferences: LiveUserPreferences;
  coverage: LiveCoverage;
}

/** A place the geocoder matched, for filling in the live events origin. */
export interface GeocodedPlace {
  name: string;
  region: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  population: number | null;
}

export interface LivePreferencesPatch {
  radiusKm?: number | null;
  lat?: number | null;
  lon?: number | null;
  regions?: string[] | null;
  announceDays?: number | null;
  imminentDaysLocal?: number | null;
  imminentDaysRegional?: number | null;
  bannerEnabled?: boolean | null;
}

/**
 * `jambase`: the last `/quota` check succeeded. `local`: it failed, so usage is
 * the last JamBase figure plus our own count. `unknown`: JamBase never answered.
 */
export type LiveQuotaSource = "jambase" | "local" | "unknown";

export interface LiveQuotaStatus {
  plan: string | null;
  used: number;
  /** Null when the plan has no monthly cap. */
  quota: number | null;
  ratio: number | null;
  overageCalls: number;
  periodStart: string | null;
  periodEnd: string | null;
  allowOverage: boolean;
  blocked: boolean;
  source: LiveQuotaSource;
  checkedAt: string | null;
}
