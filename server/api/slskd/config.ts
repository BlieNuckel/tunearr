import { getConfig } from "../../config";

export type SlskdConfig = {
  baseUrl: string;
  headers: Record<string, string>;
  downloadPath: string;
};

export const getSlskdConfig = (): SlskdConfig => {
  const config = getConfig();
  if (!config.slskdUrl || !config.slskdApiKey) {
    throw new Error("slskd URL and API key not configured");
  }
  return {
    baseUrl: config.slskdUrl.replace(/\/+$/, ""),
    headers: {
      "X-API-Key": config.slskdApiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    downloadPath: config.slskdDownloadPath,
  };
};
