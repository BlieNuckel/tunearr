import { loadConfig } from "../config";

interface LidarrConfig {
  url: string;
  headers: Record<string, string>;
}

const getLidarrConfig = (): LidarrConfig => {
  const config = loadConfig();
  if (!config.lidarrUrl || !config.lidarrApiKey) {
    throw new Error("Lidarr not configured");
  }
  return {
    url: config.lidarrUrl,
    headers: {
      "X-Api-Key": config.lidarrApiKey,
      "Content-Type": "application/json",
    },
  };
};

export { getLidarrConfig };
