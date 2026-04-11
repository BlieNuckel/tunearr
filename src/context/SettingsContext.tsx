import { ReactNode, useState, useEffect } from "react";
import {
  SettingsContext,
  type AppSettings,
  type LidarrOptions,
  type SettingsContextValue,
} from "./settingsContextDef";
import { DEFAULT_PROMOTED_ALBUM } from "./promotedAlbumDefaults";
import { DEFAULT_PURCHASE_DECISION } from "./purchaseDecisionDefaults";
import { DEFAULT_SPENDING } from "./spendingDefaults";
import { useAuth } from "./useAuth";
import { hasPermission, Permission } from "@shared/permissions";

interface SettingsContextProviderProps {
  children: ReactNode;
}

async function loadConfigStatus(
  setSettings: (fn: (prev: AppSettings) => AppSettings) => void,
  setIsLoading: (v: boolean) => void
) {
  setIsLoading(true);
  try {
    const res = await fetch("/api/settings/status");
    if (res.ok) {
      const data = await res.json();
      if (data.configured) {
        setSettings((prev) => ({ ...prev, lidarrUrl: "configured" }));
      }
    }
  } catch (error) {
    console.error("Failed to load config status:", error);
  } finally {
    setIsLoading(false);
  }
}

async function loadSettings(
  setSettings: (s: AppSettings) => void,
  setIsLoading: (v: boolean) => void
) {
  setIsLoading(true);
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings({
        lidarrUrl: data.lidarrUrl || "",
        lidarrApiKey: data.lidarrApiKey || "",
        lidarrQualityProfileId: data.lidarrQualityProfileId || 1,
        lidarrRootFolderPath: data.lidarrRootFolderPath || "",
        lidarrMetadataProfileId: data.lidarrMetadataProfileId || 1,
        lastfmApiKey: data.lastfmApiKey || "",
        plexUrl: data.plexUrl || "",
        importPath: data.importPath || "",
        slskdUrl: data.slskdUrl || "",
        slskdApiKey: data.slskdApiKey || "",
        slskdDownloadPath: data.slskdDownloadPath || "",
        promotedAlbum: {
          ...DEFAULT_PROMOTED_ALBUM,
          ...(data.promotedAlbum ?? {}),
        },
        purchaseDecision: {
          ...DEFAULT_PURCHASE_DECISION,
          ...(data.purchaseDecision ?? {}),
        },
        spending: {
          ...DEFAULT_SPENDING,
          ...(data.spending ?? {}),
        },
      });
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  } finally {
    setIsLoading(false);
  }
}

async function loadLidarrOptionValues(
  currentOptions: LidarrOptions,
  setOptions: (o: LidarrOptions) => void
) {
  try {
    const [qualityRes, metadataRes, rootRes] = await Promise.all([
      fetch("/api/lidarr/qualityprofiles"),
      fetch("/api/lidarr/metadataprofiles"),
      fetch("/api/lidarr/rootfolders"),
    ]);

    const opts = { ...currentOptions };

    if (qualityRes.ok) {
      const data = await qualityRes.json();
      opts.qualityProfiles = data;
    }
    if (metadataRes.ok) {
      const data = await metadataRes.json();
      opts.metadataProfiles = data;
    }
    if (rootRes.ok) {
      const data = await rootRes.json();
      opts.rootFolderPaths = data;
    }
    setOptions(opts);
  } catch {
    // Silently fail - user can still save settings manually
  }
}

export const SettingsContextProvider = ({
  children,
}: SettingsContextProviderProps) => {
  const { status, user } = useAuth();

  const [settings, setSettings] = useState<AppSettings>({
    lidarrUrl: "",
    lidarrApiKey: "",
    lidarrQualityProfileId: 1,
    lidarrRootFolderPath: "",
    lidarrMetadataProfileId: 1,
    lastfmApiKey: "",
    plexUrl: "",
    importPath: "",
    slskdUrl: "",
    slskdApiKey: "",
    slskdDownloadPath: "",
    promotedAlbum: DEFAULT_PROMOTED_ALBUM,
    purchaseDecision: DEFAULT_PURCHASE_DECISION,
    spending: DEFAULT_SPENDING,
  });
  const [options, setOptions] = useState<LidarrOptions>({
    qualityProfiles: [],
    metadataProfiles: [],
    rootFolderPaths: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = status === "authenticated";
  const isAdmin =
    isAuthenticated &&
    user != null &&
    hasPermission(user.permissions, Permission.ADMIN);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (isAdmin) {
      loadSettings(setSettings, setIsLoading);
    } else {
      loadConfigStatus(setSettings, setIsLoading);
    }
  }, [isAuthenticated, isAdmin]);

  const savePartialSettings = async (partial: Partial<AppSettings>) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save settings");
    }

    const merged = { ...settings, ...partial };
    setSettings(merged);

    const lidarrFieldsChanged =
      "lidarrUrl" in partial || "lidarrApiKey" in partial;

    if (lidarrFieldsChanged && merged.lidarrUrl && merged.lidarrApiKey) {
      const testResult = await testConnection(merged);
      setIsConnected(testResult.success);
      if (testResult.success) {
        await loadLidarrOptionValues(options, setOptions);
      }
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    await savePartialSettings(newSettings);
  };

  const testConnection = async (testSettings: AppSettings) => {
    const res = await fetch("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testSettings),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || "Connection failed" };
    }

    return {
      success: true,
      version: data.version,
      qualityProfiles: data.qualityProfiles,
      metadataProfiles: data.metadataProfiles,
      rootFolderPaths: data.rootFolderPaths,
    };
  };

  const value: SettingsContextValue = {
    options,
    settings,
    isConnected,
    isLoading: isAuthenticated && isLoading,
    saveSettings,
    savePartialSettings,
    testConnection,
    loadLidarrOptionValues: () => loadLidarrOptionValues(options, setOptions),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
