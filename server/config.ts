import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "./logger";

const log = createLogger("Config");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type LibraryPreference = "prefer_new" | "prefer_library" | "no_preference";

export type PromotedAlbumConfig = {
  cacheDurationMinutes: number;
  topArtistsCount: number;
  pickedArtistsCount: number;
  tagsPerArtist: number;
  deepPageMin: number;
  deepPageMax: number;
  genericTags: string[];
  libraryPreference: LibraryPreference;
};

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
  slskdUrl: string;
  slskdApiKey: string;
  slskdDownloadPath: string;
  theme: "light" | "dark" | "system";
  promotedAlbum: PromotedAlbumConfig;
};

/** Input type for setConfig — promotedAlbum is optional since defaults are deep-merged */
export type IConfigInput = Omit<IConfig, "promotedAlbum"> & {
  promotedAlbum?: Partial<PromotedAlbumConfig>;
};

export const DEFAULT_PROMOTED_ALBUM: PromotedAlbumConfig = {
  cacheDurationMinutes: 30,
  topArtistsCount: 10,
  pickedArtistsCount: 3,
  tagsPerArtist: 5,
  deepPageMin: 2,
  deepPageMax: 10,
  genericTags: [
    "seen live",
    "favorites",
    "favourite",
    "my favorite",
    "love",
    "awesome",
    "beautiful",
    "cool",
    "check out",
    "spotify",
    "under 2000 listeners",
    "all",
  ],
  libraryPreference: "prefer_new",
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
  slskdUrl: "",
  slskdApiKey: "",
  slskdDownloadPath: "",
  theme: "system",
  promotedAlbum: DEFAULT_PROMOTED_ALBUM,
};

const CONFIG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export const getConfig = (): IConfig => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf-8");
    const saved = JSON.parse(data);
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      promotedAlbum: {
        ...DEFAULT_PROMOTED_ALBUM,
        ...(saved.promotedAlbum ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG, promotedAlbum: { ...DEFAULT_PROMOTED_ALBUM } };
  }
};

const VALID_LIBRARY_PREFERENCES: LibraryPreference[] = [
  "prefer_new",
  "prefer_library",
  "no_preference",
];

function validatePositiveInt(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function validatePromotedAlbumConfig(config: PromotedAlbumConfig) {
  if (
    typeof config.cacheDurationMinutes !== "number" ||
    config.cacheDurationMinutes < 0
  ) {
    throw new Error("cacheDurationMinutes must be a non-negative number");
  }
  validatePositiveInt(config.topArtistsCount, "topArtistsCount");
  validatePositiveInt(config.pickedArtistsCount, "pickedArtistsCount");
  validatePositiveInt(config.tagsPerArtist, "tagsPerArtist");
  validatePositiveInt(config.deepPageMin, "deepPageMin");
  validatePositiveInt(config.deepPageMax, "deepPageMax");
  if (config.deepPageMax < config.deepPageMin) {
    throw new Error("deepPageMax must be >= deepPageMin");
  }
  if (!Array.isArray(config.genericTags)) {
    throw new Error("genericTags must be an array");
  }
  if (
    !VALID_LIBRARY_PREFERENCES.includes(
      config.libraryPreference as LibraryPreference
    )
  ) {
    throw new Error(
      `libraryPreference must be one of: ${VALID_LIBRARY_PREFERENCES.join(", ")}`
    );
  }
}

export const setConfig = (newConfig: Partial<IConfigInput>) => {
  if (!fs.existsSync(CONFIG_DIR)) {
    log.info(`Config directory missing, creating it in ${CONFIG_DIR}`);
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const currentConfig = getConfig();
  const mergedConfig = {
    ...currentConfig,
    ...newConfig,
    promotedAlbum: {
      ...currentConfig.promotedAlbum,
      ...(newConfig.promotedAlbum ?? {}),
    },
  };

  if (typeof mergedConfig.lidarrUrl !== "string") {
    throw new Error("lidarrUrl must be a string");
  }
  if (typeof mergedConfig.lidarrApiKey !== "string") {
    throw new Error("lidarrApiKey must be a string");
  }
  if (typeof mergedConfig.lidarrQualityProfileId !== "number") {
    throw new Error("lidarrQualityProfileId must be a number");
  }
  if (typeof mergedConfig.lidarrRootFolderPath !== "string") {
    throw new Error("lidarrRootFolderPath must be a string");
  }
  if (typeof mergedConfig.lidarrMetadataProfileId !== "number") {
    throw new Error("lidarrMetadataProfileId must be a number");
  }
  if (typeof mergedConfig.lastfmApiKey !== "string") {
    throw new Error("lastfmApiKey must be a string");
  }
  if (typeof mergedConfig.plexUrl !== "string") {
    throw new Error("plexUrl must be a string");
  }
  if (typeof mergedConfig.plexToken !== "string") {
    throw new Error("plexToken must be a string");
  }
  if (typeof mergedConfig.importPath !== "string") {
    throw new Error("importPath must be a string");
  }
  if (typeof mergedConfig.slskdUrl !== "string") {
    throw new Error("slskdUrl must be a string");
  }
  if (typeof mergedConfig.slskdApiKey !== "string") {
    throw new Error("slskdApiKey must be a string");
  }
  if (typeof mergedConfig.slskdDownloadPath !== "string") {
    throw new Error("slskdDownloadPath must be a string");
  }
  if (!["light", "dark", "system"].includes(mergedConfig.theme)) {
    throw new Error("theme must be 'light', 'dark', or 'system'");
  }

  if (newConfig.promotedAlbum !== undefined) {
    validatePromotedAlbumConfig(mergedConfig.promotedAlbum);
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(mergedConfig, null, 2));
};

export const getConfigValue = <K extends keyof IConfig>(key: K): IConfig[K] => {
  return getConfig()[key];
};
