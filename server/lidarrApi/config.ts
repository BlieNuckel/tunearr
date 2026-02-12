import { config } from "../config";

interface LidarrConfig {
  url: string;
  headers: Record<string, string>;
}

const getLidarrConfig = (): LidarrConfig => {

  if (!config.get().lidarrUrl || !config.get().lidarrApiKey) {
    throw new Error("Lidarr not configured");
  }
  return {
    url: config.get().lidarrUrl,
    headers: {
      "X-Api-Key": config.get().lidarrApiKey,
      "Content-Type": "application/json",
    },
  };
};

export { getLidarrConfig };
