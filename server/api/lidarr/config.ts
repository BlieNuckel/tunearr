import { getConfig } from "../../config";

interface LidarrConfig {
  url: string;
  headers: Record<string, string>;
}

const getLidarrConfig = (): LidarrConfig => {
  const { lidarrUrl, lidarrApiKey } = getConfig();

  if (!lidarrUrl || !lidarrApiKey) {
    throw new Error("Lidarr not configured");
  }
  return {
    url: lidarrUrl,
    headers: {
      "X-Api-Key": lidarrApiKey,
      "Content-Type": "application/json",
    },
  };
};

export { getLidarrConfig };
