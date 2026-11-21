import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDataSource } from "./db/index";
import { createLogger } from "./logger";
import {
  DEFAULT_PURCHASE_DECISION,
  DEFAULT_LIVE_EVENTS,
  type PurchaseDecisionSettings,
  type LiveEventsSettings,
} from "../shared/settingsDefaults";
import {
  DEFAULT_MUSICBRAINZ,
  mbRequestsPerSecondError,
  mbServerUrlError,
  normalizeMbServerUrl,
  type MusicBrainzSettings,
} from "../shared/musicbrainzServer";

export {
  DEFAULT_PURCHASE_DECISION,
  DEFAULT_LIVE_EVENTS,
} from "../shared/settingsDefaults";
export { DEFAULT_MUSICBRAINZ } from "../shared/musicbrainzServer";

/** Server-side aliases for the shared settings shapes. */
export type PurchaseDecisionConfig = PurchaseDecisionSettings;
export type LiveEventsConfig = LiveEventsSettings;
export type MusicBrainzConfig = MusicBrainzSettings;

const log = createLogger("Config");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * VAPID identifies this server to the browser push services. The keypair is
 * generated on first boot and kept for the lifetime of the install: replacing it
 * invalidates every existing subscription.
 */
export type WebPushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/**
 * Master switch for the notification system. Individual transports add their own
 * sub-object here (`notifications.email`, `notifications.webhook`, …) as they land.
 */
export type NotificationsConfig = {
  enabled: boolean;
  webPush: WebPushConfig;
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
  /** Shared secret Lidarr sends to `/api/torznab` and `/api/sabnzbd`. Empty disables the check. */
  torznabApiKey: string;
  purchaseDecision: PurchaseDecisionConfig;
  notifications: NotificationsConfig;
  liveEvents: LiveEventsConfig;
  musicbrainz: MusicBrainzConfig;
  followedArtistPollIntervalMs: number;
  requestStatusPollIntervalMs: number;
  /**
   * How often to read `/status/sessions` for measured listening time. Seconds-scale on
   * purpose: a track that starts and ends between two polls is never seen at all, so the
   * interval is the resolution of the whole measurement.
   */
  listenSessionPollIntervalMs: number;
  /** Master switch for copying Plex ratings, plays and listening sessions into the signal log. */
  listeningCaptureEnabled: boolean;
};

/** Input type for setConfig — nested objects are optional since defaults are deep-merged */
export type IConfigInput = Omit<
  IConfig,
  "purchaseDecision" | "notifications" | "liveEvents" | "musicbrainz"
> & {
  purchaseDecision?: Partial<PurchaseDecisionConfig>;
  liveEvents?: Partial<LiveEventsConfig>;
  musicbrainz?: Partial<MusicBrainzConfig>;
  notifications?: Partial<Omit<NotificationsConfig, "webPush">> & {
    webPush?: Partial<WebPushConfig>;
  };
};

export const DEFAULT_WEB_PUSH: WebPushConfig = {
  publicKey: "",
  privateKey: "",
  subject: "https://github.com/BlieNuckel/tunearr",
};

export const DEFAULT_NOTIFICATIONS: NotificationsConfig = {
  enabled: true,
  webPush: DEFAULT_WEB_PUSH,
};

export const DEFAULT_FOLLOWED_POLL_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_REQUEST_STATUS_POLL_INTERVAL_MS = 2 * 60 * 1000;
export const DEFAULT_LISTEN_SESSION_POLL_INTERVAL_MS = 5 * 1000;

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
  torznabApiKey: "",
  purchaseDecision: DEFAULT_PURCHASE_DECISION,
  notifications: DEFAULT_NOTIFICATIONS,
  liveEvents: DEFAULT_LIVE_EVENTS,
  musicbrainz: DEFAULT_MUSICBRAINZ,
  followedArtistPollIntervalMs: DEFAULT_FOLLOWED_POLL_INTERVAL_MS,
  requestStatusPollIntervalMs: DEFAULT_REQUEST_STATUS_POLL_INTERVAL_MS,
  listenSessionPollIntervalMs: DEFAULT_LISTEN_SESSION_POLL_INTERVAL_MS,
  listeningCaptureEnabled: true,
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

/**
 * Configs saved before the recommenders were removed hold the capture switch as
 * `promotedAlbum.ratingsBackupEnabled`, alongside knobs nothing reads any more.
 * `spending` moved onto each user; a copy left in an old config.json is dropped.
 */
function migrateLegacyKeys(
  saved: Record<string, unknown>
): Record<string, unknown> {
  const { promotedAlbum, spending: _spending, ...rest } = saved;
  const legacyCapture = (promotedAlbum as { ratingsBackupEnabled?: unknown })
    ?.ratingsBackupEnabled;
  if (
    rest.listeningCaptureEnabled === undefined &&
    legacyCapture !== undefined
  ) {
    rest.listeningCaptureEnabled = legacyCapture;
  }
  return rest;
}

function mergeWithDefaults(raw: Record<string, unknown>): IConfig {
  const saved = migrateLegacyKeys(raw);
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    purchaseDecision: {
      ...DEFAULT_PURCHASE_DECISION,
      ...((saved.purchaseDecision as Record<string, unknown>) ?? {}),
    },
    liveEvents: {
      ...DEFAULT_LIVE_EVENTS,
      ...((saved.liveEvents as Record<string, unknown>) ?? {}),
    },
    musicbrainz: {
      ...DEFAULT_MUSICBRAINZ,
      ...((saved.musicbrainz as Record<string, unknown>) ?? {}),
    },
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...((saved.notifications as Record<string, unknown>) ?? {}),
      webPush: {
        ...DEFAULT_WEB_PUSH,
        ...(((saved.notifications as { webPush?: Record<string, unknown> })
          ?.webPush ?? {}) as Record<string, unknown>),
      },
    },
  } as IConfig;
}

export const getConfig = (): IConfig => {
  const db = getRawDb();
  const row = db.prepare("SELECT data FROM config WHERE id = 1").get() as
    { data: string } | undefined;

  if (!row) {
    return {
      ...DEFAULT_CONFIG,
      purchaseDecision: { ...DEFAULT_PURCHASE_DECISION },
      notifications: { ...DEFAULT_NOTIFICATIONS },
      liveEvents: { ...DEFAULT_LIVE_EVENTS },
      musicbrainz: { ...DEFAULT_MUSICBRAINZ },
    };
  }

  return mergeWithDefaults(JSON.parse(row.data));
};

function validatePositiveInt(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function validatePurchaseDecisionConfig(config: PurchaseDecisionConfig) {
  if (!Array.isArray(config.labelBlocklist)) {
    throw new Error("labelBlocklist must be an array");
  }
  if (
    !config.labelBlocklist.every(
      (e) => typeof e === "string" && e.trim().length > 0
    )
  ) {
    throw new Error("labelBlocklist entries must be non-empty strings");
  }
  if (
    typeof config.oldReleaseThresholdYears !== "number" ||
    config.oldReleaseThresholdYears < 0
  ) {
    throw new Error("oldReleaseThresholdYears must be a non-negative number");
  }
}

function validateNotificationsConfig(config: NotificationsConfig) {
  if (typeof config.enabled !== "boolean") {
    throw new Error("notifications.enabled must be a boolean");
  }
  const webPush = config.webPush;
  if (
    typeof webPush.publicKey !== "string" ||
    typeof webPush.privateKey !== "string"
  ) {
    throw new Error("notifications.webPush keys must be strings");
  }
  if (
    typeof webPush.subject !== "string" ||
    !/^(mailto:|https:\/\/)/.test(webPush.subject)
  ) {
    throw new Error(
      "notifications.webPush.subject must be a mailto: or https:// URL"
    );
  }
}

function validateRosterFullPass(cursor: unknown) {
  if (cursor === null) return;
  const value = cursor as Record<string, unknown>;
  const valid =
    typeof cursor === "object" &&
    typeof value.startedAt === "string" &&
    (value.afterId === null || typeof value.afterId === "string") &&
    Number.isInteger(value.page) &&
    (value.page as number) >= 1;
  if (!valid) {
    throw new Error(
      "liveEvents.rosterFullPass must be null or { startedAt, afterId, page }"
    );
  }
}

/** The Developer tier only returns events up to six months out. */
const MAX_BANNER_HORIZON_DAYS = 180;

function validateLiveEventsConfig(config: LiveEventsConfig) {
  if (typeof config.enabled !== "boolean") {
    throw new Error("liveEvents.enabled must be a boolean");
  }
  if (typeof config.apiKey !== "string") {
    throw new Error("liveEvents.apiKey must be a string");
  }

  validatePositiveInt(config.bannerHorizonDays, "liveEvents.bannerHorizonDays");
  validatePositiveInt(config.rosterBatchSize, "liveEvents.rosterBatchSize");
  validatePositiveInt(config.maxPagesPerRun, "liveEvents.maxPagesPerRun");
  validatePositiveInt(
    config.sweepIntervalHours,
    "liveEvents.sweepIntervalHours"
  );
  if (typeof config.allowOverage !== "boolean") {
    throw new Error("liveEvents.allowOverage must be a boolean");
  }

  for (const [name, value] of [
    ["rosterWatermark", config.rosterWatermark],
    ["rosterFullSweptAt", config.rosterFullSweptAt],
  ] as const) {
    if (value !== null && typeof value !== "string") {
      throw new Error(`liveEvents.${name} must be a string or null`);
    }
  }
  validateRosterFullPass(config.rosterFullPass);

  if (config.bannerHorizonDays > MAX_BANNER_HORIZON_DAYS) {
    throw new Error(
      `liveEvents.bannerHorizonDays cannot exceed ${MAX_BANNER_HORIZON_DAYS}; the Developer tier returns nothing further out`
    );
  }
  if (config.rosterBatchSize > 100) {
    throw new Error("liveEvents.rosterBatchSize cannot exceed 100");
  }
}

function validateMusicBrainzConfig(config: MusicBrainzConfig) {
  if (typeof config.serverUrl !== "string") {
    throw new Error("musicbrainz.serverUrl must be a string");
  }
  const urlError = mbServerUrlError(config.serverUrl);
  if (urlError) throw new Error(`musicbrainz.serverUrl: ${urlError}`);

  const paceError = mbRequestsPerSecondError(config.requestsPerSecond);
  if (paceError) throw new Error(`musicbrainz.requestsPerSecond: ${paceError}`);
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
  if (typeof mergedConfig.torznabApiKey !== "string") {
    throw new Error("torznabApiKey must be a string");
  }
  if (
    typeof mergedConfig.followedArtistPollIntervalMs !== "number" ||
    mergedConfig.followedArtistPollIntervalMs < 60_000
  ) {
    throw new Error(
      "followedArtistPollIntervalMs must be a number >= 60000 (1 minute)"
    );
  }
  if (
    typeof mergedConfig.requestStatusPollIntervalMs !== "number" ||
    mergedConfig.requestStatusPollIntervalMs < 60_000
  ) {
    throw new Error(
      "requestStatusPollIntervalMs must be a number >= 60000 (1 minute)"
    );
  }
  if (
    typeof mergedConfig.listenSessionPollIntervalMs !== "number" ||
    mergedConfig.listenSessionPollIntervalMs < 1_000
  ) {
    throw new Error(
      "listenSessionPollIntervalMs must be a number >= 1000 (1 second)"
    );
  }
  if (typeof mergedConfig.listeningCaptureEnabled !== "boolean") {
    throw new Error("listeningCaptureEnabled must be a boolean");
  }
}

export const setConfig = (newConfig: Partial<IConfigInput>) => {
  const currentConfig = getConfig();
  const mergedConfig = {
    ...currentConfig,
    ...newConfig,
    purchaseDecision: {
      ...currentConfig.purchaseDecision,
      ...(newConfig.purchaseDecision ?? {}),
    },
    notifications: {
      ...currentConfig.notifications,
      ...(newConfig.notifications ?? {}),
      webPush: {
        ...currentConfig.notifications.webPush,
        ...(newConfig.notifications?.webPush ?? {}),
      },
    },
    liveEvents: {
      ...currentConfig.liveEvents,
      ...(newConfig.liveEvents ?? {}),
    },
    musicbrainz: {
      ...currentConfig.musicbrainz,
      ...(newConfig.musicbrainz ?? {}),
    },
  };

  validateConfig(mergedConfig);

  if (newConfig.purchaseDecision !== undefined) {
    validatePurchaseDecisionConfig(mergedConfig.purchaseDecision);
  }

  if (newConfig.notifications !== undefined) {
    validateNotificationsConfig(mergedConfig.notifications);
  }

  if (newConfig.liveEvents !== undefined) {
    validateLiveEventsConfig(mergedConfig.liveEvents);
  }

  if (newConfig.musicbrainz !== undefined) {
    validateMusicBrainzConfig(mergedConfig.musicbrainz);
    mergedConfig.musicbrainz.serverUrl = normalizeMbServerUrl(
      mergedConfig.musicbrainz.serverUrl
    );
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
    purchaseDecision: { ...DEFAULT_PURCHASE_DECISION },
    notifications: { ...DEFAULT_NOTIFICATIONS },
    musicbrainz: { ...DEFAULT_MUSICBRAINZ },
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
