import { createContext } from "react";

export type LibraryPreference =
  | "prefer_new"
  | "prefer_library"
  | "no_preference";

export interface PromotedAlbumSettings {
  cacheDurationMinutes: number;
  topArtistsCount: number;
  pickedArtistsCount: number;
  tagsPerArtist: number;
  deepPageMin: number;
  deepPageMax: number;
  genericTags: string[];
  libraryPreference: LibraryPreference;
}

export interface PurchaseDecisionSettings {
  labelBlocklist: string[];
  oldReleaseThresholdYears: number;
}

export interface SpendingSettings {
  currency: string;
  monthlyLimit: number | null;
}

export interface AppSettings {
  lidarrUrl: string;
  lidarrApiKey: string;
  lidarrQualityProfileId: number;
  lidarrRootFolderPath: string;
  lidarrMetadataProfileId: number;
  lastfmApiKey: string;
  plexUrl: string;
  importPath: string;
  slskdUrl: string;
  slskdApiKey: string;
  slskdDownloadPath: string;
  promotedAlbum?: PromotedAlbumSettings;
  purchaseDecision?: PurchaseDecisionSettings;
  spending?: SpendingSettings;
}

export type LidarrOptions = {
  qualityProfiles: { id: number; name: string }[];
  metadataProfiles: { id: number; name: string }[];
  rootFolderPaths: { id: number; path: string }[];
};

export interface SettingsContextValue {
  options: LidarrOptions;
  settings: AppSettings;
  isConnected: boolean;
  isLoading: boolean;
  saveSettings: (newSettings: AppSettings) => Promise<void>;
  savePartialSettings: (partial: Partial<AppSettings>) => Promise<void>;
  testConnection: (testSettings: AppSettings) => Promise<{
    success: boolean;
    version?: string;
    error?: string;
    qualityProfiles?: { id: number; name: string }[];
    metadataProfiles?: { id: number; name: string }[];
    rootFolderPaths?: { id: number; path: string }[];
  }>;
  loadLidarrOptionValues: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);
