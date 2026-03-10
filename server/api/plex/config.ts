import { getConfig } from "../../config";

interface PlexConfig {
  baseUrl: string;
  headers: Record<string, string>;
  token: string;
}

export const getPlexConfig = (userPlexToken: string): PlexConfig => {
  const config = getConfig();
  if (!config.plexUrl) {
    throw new Error("Plex URL not configured");
  }
  if (!userPlexToken) {
    throw new Error("No Plex token available — sign in with Plex first");
  }
  return {
    baseUrl: config.plexUrl.replace(/\/+$/, ""),
    headers: {
      "X-Plex-Token": userPlexToken,
      Accept: "application/json",
    },
    token: userPlexToken,
  };
};
