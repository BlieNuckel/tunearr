import { createContext } from "react";

export type LibraryPreference = "prefer_new" | "prefer_library" | "no_preference";

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

export interface LidarrSettings {
  lidarrUrl: string;
  lidarrApiKey: string;
  lidarrQualityProfileId: number;
  lidarrRootFolderPath: string;
  lidarrMetadataProfileId: number;
  lastfmApiKey: string;
  plexUrl: string;
  plexToken: string;
  importPath: string;
  slskdUrl: string;
  slskdApiKey: string;
  slskdDownloadPath: string;
  theme: "light" | "dark" | "system";
  promotedAlbum?: PromotedAlbumSettings;
}

export type LidarrOptions = {
  qualityProfiles: { id: number; name: string }[];
  metadataProfiles: { id: number; name: string }[];
  rootFolderPaths: { id: number; path: string }[];
};

export interface LidarrContextValue {
  options: LidarrOptions;
  settings: LidarrSettings;
  isConnected: boolean;
  isLoading: boolean;
  saveSettings: (newSettings: LidarrSettings) => Promise<void>;
  savePartialSettings: (partial: Partial<LidarrSettings>) => Promise<void>;
  testConnection: (testSettings: LidarrSettings) => Promise<{
    success: boolean;
    version?: string;
    error?: string;
    qualityProfiles?: { id: number; name: string }[];
    metadataProfiles?: { id: number; name: string }[];
    rootFolderPaths?: { id: number; path: string }[];
  }>;
  loadLidarrOptionValues: () => Promise<void>;
}

export const LidarrContext = createContext<LidarrContextValue | undefined>(
  undefined
);
