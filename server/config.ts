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
  importPath: string;
  theme: "light" | "dark" | "system";
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
  importPath: "",
  theme: "system",
};

const CONFIG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const validateConfig = (config: Partial<IConfig>) => {
  if (config.lidarrUrl !== undefined && typeof config.lidarrUrl !== "string") {
    throw new Error("lidarrUrl must be a string");
  }
  if (
    config.lidarrApiKey !== undefined &&
    typeof config.lidarrApiKey !== "string"
  ) {
    throw new Error("lidarrApiKey must be a string");
  }
  if (
    config.lidarrQualityProfileId !== undefined &&
    typeof config.lidarrQualityProfileId !== "number"
  ) {
    throw new Error("lidarrQualityProfileId must be a number");
  }
  if (
    config.lidarrRootFolderPath !== undefined &&
    typeof config.lidarrRootFolderPath !== "string"
  ) {
    throw new Error("lidarrRootFolderPath must be a string");
  }
  if (
    config.lidarrMetadataProfileId !== undefined &&
    typeof config.lidarrMetadataProfileId !== "number"
  ) {
    throw new Error("lidarrMetadataProfileId must be a number");
  }
  if (
    config.lastfmApiKey !== undefined &&
    typeof config.lastfmApiKey !== "string"
  ) {
    throw new Error("lastfmApiKey must be a string");
  }
  if (config.plexUrl !== undefined && typeof config.plexUrl !== "string") {
    throw new Error("plexUrl must be a string");
  }
  if (config.plexToken !== undefined && typeof config.plexToken !== "string") {
    throw new Error("plexToken must be a string");
  }
  if (
    config.importPath !== undefined &&
    typeof config.importPath !== "string"
  ) {
    throw new Error("importPath must be a string");
  }
  if (
    config.theme !== undefined &&
    !["light", "dark", "system"].includes(config.theme)
  ) {
    throw new Error("theme must be 'light', 'dark', or 'system'");
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
  if (!fs.existsSync(CONFIG_DIR)) {
    console.log(`config directory missing. creating it in ${CONFIG_DIR}`);
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const currentConfig = getConfig();
  const mergedConfig = { ...currentConfig, ...newConfig };

  if (
    mergedConfig.theme &&
    !["light", "dark", "system"].includes(mergedConfig.theme)
  ) {
    throw new Error("theme must be 'light', 'dark', or 'system'");
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(mergedConfig, null, 2));
};

export const getConfigValue = <K extends keyof IConfig>(key: K): IConfig[K] => {
  return getConfig()[key];
};
