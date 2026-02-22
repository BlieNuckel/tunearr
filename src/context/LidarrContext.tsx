import { ReactNode, useState, useEffect } from "react";
import {
  LidarrContext,
  type LidarrSettings,
  type LidarrOptions,
  type LidarrContextValue,
} from "./lidarrContextDef";

interface LidarrContextProviderProps {
  children: ReactNode;
}

async function loadSettings(
  setSettings: (s: LidarrSettings) => void,
  setIsConnected: (v: boolean) => void,
  setIsLoading: (v: boolean) => void
) {
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
        theme: data.theme || "system",
      });

      if (data.lidarrUrl && data.lidarrApiKey) {
        const testRes = await fetch("/api/settings/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lidarrUrl: data.lidarrUrl,
            lidarrApiKey: data.lidarrApiKey,
          }),
        });
        const testData = await testRes.json();
        setIsConnected(testRes.ok && testData.success);
      }
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
    theme: "system",
  });
  const [options, setOptions] = useState<LidarrOptions>({
    qualityProfiles: [],
    metadataProfiles: [],
    rootFolderPaths: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings(setSettings, setIsConnected, setIsLoading);
  }, []);

  const saveSettings = async (newSettings: LidarrSettings) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save settings");
    }

    setSettings({
      lidarrUrl: newSettings.lidarrUrl,
      lidarrApiKey: newSettings.lidarrApiKey,
      lidarrQualityProfileId: newSettings.lidarrQualityProfileId,
      lidarrRootFolderPath: newSettings.lidarrRootFolderPath,
      lidarrMetadataProfileId: newSettings.lidarrMetadataProfileId,
      lastfmApiKey: newSettings.lastfmApiKey || "",
      plexUrl: newSettings.plexUrl || "",
      plexToken: newSettings.plexToken || "",
      importPath: newSettings.importPath || "",
      slskdUrl: newSettings.slskdUrl || "",
      slskdApiKey: newSettings.slskdApiKey || "",
      slskdDownloadPath: newSettings.slskdDownloadPath || "",
      theme: newSettings.theme || "system",
    });

    await loadLidarrOptionValues(options, setOptions);
    await loadSettings(setSettings, setIsConnected, setIsLoading);
    const testResult = await testConnection(newSettings);
    setIsConnected(testResult.success);
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
    isLoading,
    saveSettings,
    testConnection,
    loadLidarrOptionValues: () => loadLidarrOptionValues(options, setOptions),
  };

  return (
    <LidarrContext.Provider value={value}>{children}</LidarrContext.Provider>
  );
};
