import { ReactNode, useState, useEffect } from "react";
import {
  LidarrContext,
  type LidarrSettings,
  type LidarrOptions,
  type LidarrContextValue,
} from "./lidarrContextDef";
import { DEFAULT_PROMOTED_ALBUM } from "./promotedAlbumDefaults";
import { useAuth } from "./useAuth";

interface LidarrContextProviderProps {
  children: ReactNode;
}

async function loadSettings(
  setSettings: (s: LidarrSettings) => void,
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
        plexToken: data.plexToken || "",
        importPath: data.importPath || "",
        slskdUrl: data.slskdUrl || "",
        slskdApiKey: data.slskdApiKey || "",
        slskdDownloadPath: data.slskdDownloadPath || "",
        promotedAlbum: {
          ...DEFAULT_PROMOTED_ALBUM,
          ...(data.promotedAlbum ?? {}),
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

export const LidarrContextProvider = ({
  children,
}: LidarrContextProviderProps) => {
  const { status, user } = useAuth();

  const [settings, setSettings] = useState<LidarrSettings>({
    lidarrUrl: "",
    lidarrApiKey: "",
    lidarrQualityProfileId: 1,
    lidarrRootFolderPath: "",
    lidarrMetadataProfileId: 1,
    lastfmApiKey: "",
    plexUrl: "",
    plexToken: "",
    importPath: "",
    slskdUrl: "",
    slskdApiKey: "",
    slskdDownloadPath: "",
    promotedAlbum: DEFAULT_PROMOTED_ALBUM,
  });
  const [options, setOptions] = useState<LidarrOptions>({
    qualityProfiles: [],
    metadataProfiles: [],
    rootFolderPaths: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && user?.role === "admin") {
      loadSettings(setSettings, setIsLoading);
    }
  }, [status, user?.role]);

  const savePartialSettings = async (partial: Partial<LidarrSettings>) => {
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

  const saveSettings = async (newSettings: LidarrSettings) => {
    await savePartialSettings(newSettings);
  };

  const testConnection = async (testSettings: LidarrSettings) => {
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

  const value: LidarrContextValue = {
    options,
    settings,
    isConnected,
    isLoading:
      status === "authenticated" && user?.role === "admin" && isLoading,
    saveSettings,
    savePartialSettings,
    testConnection,
    loadLidarrOptionValues: () => loadLidarrOptionValues(options, setOptions),
  };

  return (
    <LidarrContext.Provider value={value}>{children}</LidarrContext.Provider>
  );
};
