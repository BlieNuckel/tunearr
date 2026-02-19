import { getConfigValue } from "../config";

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

/** @returns a full Last.fm API URL with api_key and format params */
export const buildUrl = (
  method: string,
  params: Record<string, string>
): string => {
  const apiKey = getConfigValue("lastfmApiKey");
  if (!apiKey) throw new Error("Last.fm API key not configured");

  const searchParams = new URLSearchParams({
    method,
    api_key: apiKey,
    format: "json",
    ...params,
  });
  return `${LASTFM_BASE}?${searchParams.toString()}`;
};
