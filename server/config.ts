import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDataSource } from "./db/index";
import { createLogger } from "./logger";

const log = createLogger("Config");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type LibraryPreference =
  | "prefer_new"
  | "prefer_library"
  | "no_preference";

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
  importPath: string;
  slskdUrl: string;
  slskdApiKey: string;
  slskdDownloadPath: string;
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
  importPath: "",
  slskdUrl: "",
  slskdApiKey: "",
  slskdDownloadPath: "",
  promotedAlbum: DEFAULT_PROMOTED_ALBUM,
};

type RawStatement = {
  get(...params: unknown[]): Record<string, unknown> | undefined;
  run(...params: unknown[]): unknown;
};

type RawDatabase = {
  prepare(sql: string): RawStatement;
};

function getRawDb(): RawDatabase {
  const ds = getDataSource();
  return (ds.driver as unknown as { databaseConnection: RawDatabase })
    .databaseConnection;
}

function mergeWithDefaults(saved: Record<string, unknown>): IConfig {
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    promotedAlbum: {
      ...DEFAULT_PROMOTED_ALBUM,
      ...((saved.promotedAlbum as Record<string, unknown>) ?? {}),
    },
  } as IConfig;
}

export const getConfig = (): IConfig => {
  const db = getRawDb();
  const row = db.prepare("SELECT data FROM config WHERE id = 1").get() as
    | { data: string }
    | undefined;

  if (!row) {
    return { ...DEFAULT_CONFIG, promotedAlbum: { ...DEFAULT_PROMOTED_ALBUM } };
  }

  return mergeWithDefaults(JSON.parse(row.data));
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

function validateConfig(mergedConfig: IConfig) {
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
}

export const setConfig = (newConfig: Partial<IConfigInput>) => {
  const currentConfig = getConfig();
  const mergedConfig = {
    ...currentConfig,
    ...newConfig,
    promotedAlbum: {
      ...currentConfig.promotedAlbum,
      ...(newConfig.promotedAlbum ?? {}),
    },
  };

  validateConfig(mergedConfig);

  if (newConfig.promotedAlbum !== undefined) {
    validatePromotedAlbumConfig(mergedConfig.promotedAlbum);
  }

  const db = getRawDb();
  db.prepare("UPDATE config SET data = ? WHERE id = 1").run(
    JSON.stringify(mergedConfig)
  );
};

export const getConfigValue = <K extends keyof IConfig>(key: K): IConfig[K] => {
  return getConfig()[key];
};

function getConfigJsonPath(): string {
  const configDir =
    process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
  return path.join(configDir, "config.json");
}

export const initializeConfig = () => {
  const db = getRawDb();
  const row = db.prepare("SELECT data FROM config WHERE id = 1").get();

  if (row) {
    return;
  }

  let initialConfig: IConfig = {
    ...DEFAULT_CONFIG,
    promotedAlbum: { ...DEFAULT_PROMOTED_ALBUM },
  };

  const configJsonPath = getConfigJsonPath();
  if (fs.existsSync(configJsonPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(configJsonPath, "utf-8"));
      initialConfig = mergeWithDefaults(saved);
      fs.renameSync(configJsonPath, configJsonPath + ".migrated");
      log.info("Migrated config from config.json to database");
    } catch {
      log.warn("Failed to read config.json, using defaults");
    }
  }

  db.prepare("INSERT INTO config (id, data) VALUES (1, ?)").run(
    JSON.stringify(initialConfig)
  );
};
