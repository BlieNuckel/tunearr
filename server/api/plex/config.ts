import { getConfig } from "../../config";

interface PlexConfig {
  baseUrl: string;
  headers: Record<string, string>;
  token: string;
}

export const getPlexConfig = (): PlexConfig => {
  const config = getConfig();
  if (!config.plexUrl || !config.plexToken) {
    throw new Error("Plex URL and token not configured");
  }
  return {
    baseUrl: config.plexUrl.replace(/\/+$/, ""),
    headers: {
      "X-Plex-Token": config.plexToken,
      Accept: "application/json",
    },
    token: config.plexToken,
  };
};
