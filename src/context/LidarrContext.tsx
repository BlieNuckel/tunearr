import {
  createContext,
  ReactNode,
  useState,
  useEffect,
  useContext,
} from "react";

interface LidarrSettings {
  lidarrUrl: string;
  lidarrApiKey: string;
  lidarrQualityProfileId: number;
  lidarrRootFolderPath: string;
  lidarrMetadataProfileId: number;
}

type LidarrOptions = {
  qualityProfiles: { id: number; name: string }[];
  metadataProfiles: { id: number; name: string }[];
  rootFolderPaths: { id: number; path: string }[];
};

interface LidarrContextValue {
  options: LidarrOptions;
  settings: LidarrSettings;
  isConnected: boolean;
  isLoading: boolean;
  saveSettings: (newSettings: LidarrSettings) => Promise<void>;
  testConnection: (
    testSettings: LidarrSettings,
  ) => Promise<{ success: boolean; version?: string; error?: string }>;
  loadLidarrOptionValues: () => Promise<void>;
}

const LidarrContext = createContext<LidarrContextValue | undefined>(undefined);

interface LidarrContextProviderProps {
  children: ReactNode;
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
  });
  const [options, setOptions] = useState<LidarrOptions>({
    qualityProfiles: [],
    metadataProfiles: [],
    rootFolderPaths: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
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
    };

    loadSettings();
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
      lidarrApiKey: "••••" + newSettings.lidarrApiKey.slice(-4),
      lidarrQualityProfileId: newSettings.lidarrQualityProfileId,
      lidarrRootFolderPath: newSettings.lidarrRootFolderPath,
      lidarrMetadataProfileId: newSettings.lidarrMetadataProfileId,
    });

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

    return { success: true, version: data.version };
  };

  const loadLidarrOptionValues = async () => {
    try {
      const [qualityRes, metadataRes, rootRes] = await Promise.all([
        fetch("/api/lidarr/qualityprofiles"),
        fetch("/api/lidarr/metadataprofiles"),
        fetch("/api/lidarr/rootfolders"),
      ]);

      if (qualityRes.ok) {
        const data = await qualityRes.json();
        setOptions((prev) => ({ ...prev, qualityProfiles: data }));
      }
      if (metadataRes.ok) {
        const data = await metadataRes.json();
        setOptions((prev) => ({ ...prev, metadataProfiles: data }));
      }
      if (rootRes.ok) {
        const data = await rootRes.json();
        setOptions((prev) => ({ ...prev, rootFolderPaths: data }));
      }
    } catch (err) {
      // Silently fail - user can still save settings manually
    }
  };

  const value: LidarrContextValue = {
    options,
    settings,
    isConnected,
    isLoading,
    saveSettings,
    testConnection,
    loadLidarrOptionValues
  };

  return (
    <LidarrContext.Provider value={value}>{children}</LidarrContext.Provider>
  );
};

export const useLidarrContext = () => {
  const context = useContext(LidarrContext);
  if (!context) {
    throw new Error(
      "useLidarrContext must be used within LidarrContextProvider",
    );
  }
  return context;
};
