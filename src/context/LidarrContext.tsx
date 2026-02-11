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
}

interface LidarrContextValue {
  settings: LidarrSettings;
  isConnected: boolean;
  isLoading: boolean;
  saveSettings: (newSettings: LidarrSettings) => Promise<void>;
  testConnection: (
    testSettings: LidarrSettings,
  ) => Promise<{ success: boolean; version?: string; error?: string }>;
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

  const value: LidarrContextValue = {
    settings,
    isConnected,
    isLoading,
    saveSettings,
    testConnection,
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
