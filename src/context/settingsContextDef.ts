import { createContext } from "react";
import type {
  LiveEventsSettings,
  PurchaseDecisionSettings,
  SpendingSettings,
} from "@shared/settingsDefaults";
import type { MusicBrainzSettings } from "@shared/musicbrainzServer";

export type { MusicBrainzSettings } from "@shared/musicbrainzServer";

export type {
  LiveEventsSettings,
  PurchaseDecisionSettings,
  SpendingSettings,
} from "@shared/settingsDefaults";

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
  torznabApiKey: string;
  listeningCaptureEnabled?: boolean;
  purchaseDecision?: PurchaseDecisionSettings;
  spending?: SpendingSettings;
  liveEvents?: LiveEventsSettings;
  musicbrainz?: MusicBrainzSettings;
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
  /** Why the last settings load failed, or null. Distinguishes a failed load from an unconfigured install. */
  loadError: string | null;
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
  testSlskdConnection: (testSettings: AppSettings) => Promise<{
    success: boolean;
    version?: string | null;
    soulseekConnected?: boolean;
    error?: string;
  }>;
  loadLidarrOptionValues: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);
