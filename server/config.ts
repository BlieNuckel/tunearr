import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type IConfig = {
  lidarrUrl: string;
  lidarrApiKey: string;
  lidarrQualityProfileId: number;
  lidarrRootFolderPath: string;
  lidarrMetadataProfileId: number;
  lastfmApiKey: string;
  plexUrl: string;
  plexToken: string;
};

const DEFAULT_CONFIG: IConfig = {
  lidarrUrl: "",
  lidarrApiKey: "",
  lidarrQualityProfileId: 1,
  lidarrRootFolderPath: "",
  lidarrMetadataProfileId: 1,
  lastfmApiKey: "",
  plexUrl: "",
  plexToken: "",
};

const CONFIG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const validateConfig = (config: Partial<IConfig>) => {
  if (typeof config.lidarrUrl !== "string") {
    throw new Error("lidarrUrl must be a string");
  }
  if (typeof config.lidarrApiKey !== "string") {
    throw new Error("lidarrApiKey must be a string");
  }
  if (typeof config.lidarrQualityProfileId !== "number") {
    throw new Error("lidarrQualityProfileId must be a number");
  }
  if (typeof config.lidarrRootFolderPath !== "string") {
    throw new Error("lidarrRootFolderPath must be a string");
  }
  if (typeof config.lidarrMetadataProfileId !== "number") {
    throw new Error("lidarrMetadataProfileId must be a number");
  }
  if (config.lastfmApiKey !== undefined && typeof config.lastfmApiKey !== "string") {
    throw new Error("lastfmApiKey must be a string");
  }
  if (config.plexUrl !== undefined && typeof config.plexUrl !== "string") {
    throw new Error("plexUrl must be a string");
  }
  if (config.plexToken !== undefined && typeof config.plexToken !== "string") {
    throw new Error("plexToken must be a string");
  }
};

export const getConfig = (): IConfig => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};

export const setConfig = (newConfig: Partial<IConfig>) => {
  validateConfig(newConfig);

  if (!fs.existsSync(CONFIG_DIR)) {
    console.log(`config directory missing. creating it in ${CONFIG_DIR}`);
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const currentConfig = getConfig();
  const mergedConfig = { ...currentConfig, ...newConfig };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(mergedConfig, null, 2));
};

export const getConfigValue = (key: keyof IConfig) => {
  return getConfig()[key];
};
