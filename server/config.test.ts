import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { initializeDatabase, closeDatabase, getDataSource } from "./db/index";
import { DEFAULT_PURCHASE_DECISION as SHARED_PURCHASE_DECISION } from "../shared/settingsDefaults";
import {
  getConfig,
  setConfig,
  getConfigValue,
  initializeConfig,
  DEFAULT_LIVE_EVENTS,
  DEFAULT_NOTIFICATIONS,
} from "./config";
import { DEFAULT_MUSICBRAINZ } from "../shared/musicbrainzServer";

let tmpDir: string;
let originalEnv: string | undefined;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
  fs.mkdirSync(path.join(tmpDir, "logs"), { recursive: true });
  originalEnv = process.env.APP_CONFIG_DIR;
  process.env.APP_CONFIG_DIR = tmpDir;
  await initializeDatabase(path.join(tmpDir, "test.db"));
});

afterEach(async () => {
  await closeDatabase();
  process.env.APP_CONFIG_DIR = originalEnv;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("initializeConfig", () => {
  it("seeds defaults when no config.json exists", () => {
    initializeConfig();
    const config = getConfig();

    expect(config.lidarrUrl).toBe("");
    expect(config.lidarrApiKey).toBe("");
    expect(config.listeningCaptureEnabled).toBe(true);
  });

  it("migrates data from config.json on first run", () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({
        lidarrUrl: "http://lidarr:8686",
        lidarrApiKey: "abc",
      })
    );

    initializeConfig();
    const config = getConfig();

    expect(config.lidarrUrl).toBe("http://lidarr:8686");
    expect(config.lidarrApiKey).toBe("abc");
    expect(config.lidarrQualityProfileId).toBe(1);
  });

  it("renames config.json to config.json.migrated after migration", () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ lidarrUrl: "http://test:8686" })
    );

    initializeConfig();

    expect(fs.existsSync(path.join(tmpDir, "config.json"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, "config.json.migrated"))).toBe(true);
  });

  it("does not overwrite existing DB config on subsequent calls", () => {
    initializeConfig();
    setConfig({ lidarrUrl: "http://updated:8686" });

    initializeConfig();
    const config = getConfig();
    expect(config.lidarrUrl).toBe("http://updated:8686");
  });

  it("carries the legacy capture switch over from config.json", () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({
        promotedAlbum: { ratingsBackupEnabled: false, topArtistsCount: 20 },
      })
    );

    initializeConfig();
    const config = getConfig();

    expect(config.listeningCaptureEnabled).toBe(false);
    expect(config).not.toHaveProperty("promotedAlbum");
  });
});

describe("getConfig", () => {
  it("returns defaults when DB row exists with empty data", () => {
    initializeConfig();
    const config = getConfig();

    expect(config.lidarrUrl).toBe("");
    expect(config.lidarrApiKey).toBe("");
    expect(config.lidarrQualityProfileId).toBe(1);
    expect(config.lidarrRootFolderPath).toBe("");
    expect(config.lidarrMetadataProfileId).toBe(1);
    expect(config.lastfmApiKey).toBe("");
    expect(config.plexUrl).toBe("");
    expect(config.importPath).toBe("");
    expect(config.slskdUrl).toBe("");
    expect(config.slskdApiKey).toBe("");
    expect(config.slskdDownloadPath).toBe("");
    expect(config.torznabApiKey).toBe("");
  });

  it("reads saved config and merges with defaults", () => {
    initializeConfig();
    setConfig({ lidarrUrl: "http://lidarr:8686", lidarrApiKey: "abc" });

    const config = getConfig();
    expect(config.lidarrUrl).toBe("http://lidarr:8686");
    expect(config.lidarrApiKey).toBe("abc");
    expect(config.lidarrQualityProfileId).toBe(1);
  });
});

describe("setConfig", () => {
  beforeEach(() => {
    initializeConfig();
  });

  it("writes config and merges with existing", () => {
    const base = {
      lidarrUrl: "http://test:8686",
      lidarrApiKey: "key1",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "/music",
      lidarrMetadataProfileId: 1,
    };

    setConfig(base);
    let config = getConfig();
    expect(config.lidarrUrl).toBe("http://test:8686");
    expect(config.lidarrApiKey).toBe("key1");

    setConfig({ ...base, lidarrUrl: "http://updated:8686" });
    config = getConfig();
    expect(config.lidarrUrl).toBe("http://updated:8686");
  });

  it("validates types", () => {
    expect(() => setConfig({ lidarrUrl: 123 as unknown as string })).toThrow(
      "lidarrUrl must be a string"
    );

    expect(() =>
      setConfig({
        lidarrUrl: "",
        lidarrApiKey: "",
        lidarrQualityProfileId: "bad" as unknown as number,
      })
    ).toThrow("lidarrQualityProfileId must be a number");

    expect(() =>
      setConfig({ torznabApiKey: 123 as unknown as string })
    ).toThrow("torznabApiKey must be a string");
  });

  it("round-trips torznabApiKey", () => {
    initializeConfig();
    setConfig({ torznabApiKey: "s3cret" });

    expect(getConfigValue("torznabApiKey")).toBe("s3cret");
  });
});

describe("getConfigValue", () => {
  it("returns specific config value", () => {
    initializeConfig();
    setConfig({ lastfmApiKey: "fm-key-123" });

    expect(getConfigValue("lastfmApiKey")).toBe("fm-key-123");
    expect(getConfigValue("lidarrQualityProfileId")).toBe(1);
  });
});

describe("listening capture config", () => {
  beforeEach(() => {
    initializeConfig();
  });

  it("is on by default", () => {
    expect(getConfig().listeningCaptureEnabled).toBe(true);
  });

  it("can be turned off", () => {
    setConfig({ listeningCaptureEnabled: false });
    expect(getConfigValue("listeningCaptureEnabled")).toBe(false);
  });

  it("rejects a non-boolean", () => {
    expect(() =>
      setConfig({ listeningCaptureEnabled: "yes" as never })
    ).toThrow("listeningCaptureEnabled must be a boolean");
  });

  it("reads the switch from a stored legacy promotedAlbum section", async () => {
    await getDataSource().query("UPDATE config SET data = ? WHERE id = 1", [
      JSON.stringify({
        lidarrUrl: "http://lidarr:8686",
        promotedAlbum: { ratingsBackupEnabled: false, topArtistsCount: 20 },
      }),
    ]);

    const config = getConfig();
    expect(config.listeningCaptureEnabled).toBe(false);
    expect(config).not.toHaveProperty("promotedAlbum");
  });

  it("drops an instance-wide spending section, which now lives on each user", async () => {
    await getDataSource().query("UPDATE config SET data = ? WHERE id = 1", [
      JSON.stringify({ spending: { currency: "SEK", monthlyLimit: 5000 } }),
    ]);

    expect(getConfig()).not.toHaveProperty("spending");
  });

  it("prefers an explicit top-level switch over the legacy one", async () => {
    await getDataSource().query("UPDATE config SET data = ? WHERE id = 1", [
      JSON.stringify({
        listeningCaptureEnabled: true,
        promotedAlbum: { ratingsBackupEnabled: false },
      }),
    ]);

    expect(getConfig().listeningCaptureEnabled).toBe(true);
  });

  it("drops the legacy section on the next save", async () => {
    await getDataSource().query("UPDATE config SET data = ? WHERE id = 1", [
      JSON.stringify({ promotedAlbum: { ratingsBackupEnabled: false } }),
    ]);

    setConfig({ lidarrUrl: "http://lidarr:8686" });

    const [{ data }] = (await getDataSource().query(
      "SELECT data FROM config WHERE id = 1"
    )) as { data: string }[];
    const stored = JSON.parse(data);
    expect(stored).not.toHaveProperty("promotedAlbum");
    expect(stored.listeningCaptureEnabled).toBe(false);
  });
});

describe("notifications config", () => {
  beforeEach(() => {
    initializeConfig();
  });

  it("returns defaults when nothing has been set", () => {
    expect(getConfig().notifications).toEqual(DEFAULT_NOTIFICATIONS);
  });

  it("deep merges notifications on setConfig", () => {
    setConfig({ notifications: { enabled: false } });

    expect(getConfig().notifications.enabled).toBe(false);
  });

  it("validates the enabled flag", () => {
    expect(() =>
      setConfig({ notifications: { enabled: "yes" } as never })
    ).toThrow("notifications.enabled must be a boolean");
  });
});

describe("web push config", () => {
  beforeEach(() => {
    initializeConfig();
  });

  it("starts with no keypair and a valid default subject", () => {
    const { webPush } = getConfig().notifications;

    expect(webPush.publicKey).toBe("");
    expect(webPush.privateKey).toBe("");
    expect(webPush.subject.startsWith("https://")).toBe(true);
  });

  it("deep merges webPush without clearing the other notification fields", () => {
    setConfig({ notifications: { webPush: { publicKey: "pub" } } });
    const { notifications } = getConfig();

    expect(notifications.webPush.publicKey).toBe("pub");
    expect(notifications.webPush.subject).toBe(
      DEFAULT_NOTIFICATIONS.webPush.subject
    );
    expect(notifications.enabled).toBe(true);
  });

  it("rejects a subject that is not mailto: or https://", () => {
    expect(() =>
      setConfig({ notifications: { webPush: { subject: "tunearr" } } })
    ).toThrow(
      "notifications.webPush.subject must be a mailto: or https:// URL"
    );
  });

  it("accepts a mailto: subject", () => {
    setConfig({
      notifications: { webPush: { subject: "mailto:admin@example.com" } },
    });

    expect(getConfig().notifications.webPush.subject).toBe(
      "mailto:admin@example.com"
    );
  });
});

describe("shared settings defaults", () => {
  beforeEach(() => {
    initializeConfig();
  });

  it("seeds every shared default section verbatim", () => {
    const config = getConfig();

    expect(config.purchaseDecision).toEqual(SHARED_PURCHASE_DECISION);
  });

  it("treats a null nested section as 'no change' rather than wiping it", () => {
    setConfig({ purchaseDecision: { oldReleaseThresholdYears: 25 } });
    setConfig({ purchaseDecision: null as never });

    expect(getConfig().purchaseDecision.oldReleaseThresholdYears).toBe(25);
  });

  it("still validates a nested section supplied as null-valued keys", () => {
    expect(() =>
      setConfig({
        purchaseDecision: { oldReleaseThresholdYears: null } as never,
      })
    ).toThrow("oldReleaseThresholdYears must be a non-negative number");
  });

  it("does not let a partial nested write drop the other keys", () => {
    setConfig({ purchaseDecision: { labelBlocklist: ["Sony"] } });
    setConfig({ purchaseDecision: { oldReleaseThresholdYears: 25 } });

    const { purchaseDecision } = getConfig();
    expect(purchaseDecision.oldReleaseThresholdYears).toBe(25);
    expect(purchaseDecision.labelBlocklist).toEqual(["Sony"]);
  });
});

describe("liveEvents config", () => {
  beforeEach(() => {
    initializeConfig();
  });

  it("defaults to disabled with no key, so nothing calls JamBase by accident", () => {
    const { liveEvents } = getConfig();
    expect(liveEvents).toEqual(DEFAULT_LIVE_EVENTS);
    expect(liveEvents.enabled).toBe(false);
    expect(liveEvents.apiKey).toBe("");
  });

  it("deep-merges a partial patch without wiping siblings", () => {
    setConfig({ liveEvents: { apiKey: "jbd_test" } as never });
    const { liveEvents } = getConfig();

    expect(liveEvents.apiKey).toBe("jbd_test");
    expect(liveEvents.sweepRadiusKm).toBe(DEFAULT_LIVE_EVENTS.sweepRadiusKm);
    expect(liveEvents.announceDays).toBe(DEFAULT_LIVE_EVENTS.announceDays);
  });

  it("accepts a null origin, which is the unconfigured state", () => {
    expect(() =>
      setConfig({ liveEvents: { originLat: null, originLon: null } as never })
    ).not.toThrow();
  });

  it("rejects coordinates outside the possible range", () => {
    expect(() => setConfig({ liveEvents: { originLat: 91 } as never })).toThrow(
      "originLat must be between -90 and 90"
    );
    expect(() =>
      setConfig({ liveEvents: { originLon: -181 } as never })
    ).toThrow("originLon must be between -180 and 180");
  });

  it("rejects a banner horizon past the tier's six-month window", () => {
    expect(() =>
      setConfig({ liveEvents: { bannerHorizonDays: 365 } as never })
    ).toThrow("bannerHorizonDays cannot exceed 180");

    expect(() =>
      setConfig({ liveEvents: { bannerHorizonDays: 180 } as never })
    ).not.toThrow();
  });

  it("requires allowOverage to be a boolean", () => {
    expect(() =>
      setConfig({ liveEvents: { allowOverage: "yes" } as never })
    ).toThrow("liveEvents.allowOverage must be a boolean");
  });

  it("keeps paid usage off unless an admin turns it on", () => {
    expect(getConfig().liveEvents.allowOverage).toBe(false);
  });

  it("rejects a roster batch larger than the API accepts", () => {
    expect(() =>
      setConfig({ liveEvents: { rosterBatchSize: 250 } as never })
    ).toThrow("rosterBatchSize cannot exceed 100");
  });

  it("requires uppercase ISO 3166-1 alpha-2 regions", () => {
    expect(() =>
      setConfig({ liveEvents: { regions: ["SE", "DK"] } as never })
    ).not.toThrow();

    expect(() =>
      setConfig({ liveEvents: { regions: ["se"] } as never })
    ).toThrow("must be uppercase");

    expect(() =>
      setConfig({ liveEvents: { regions: ["SWE"] } as never })
    ).toThrow("alpha-2");

    expect(() => setConfig({ liveEvents: { regions: "SE" } as never })).toThrow(
      "regions must be an array"
    );
  });

  it("rejects a code that is shaped right but is not a country", () => {
    expect(() =>
      setConfig({ liveEvents: { regions: ["QQ"] } as never })
    ).toThrow("alpha-2");
  });

  it("rejects UK, because geoCountryIso2 expects GB", () => {
    expect(() =>
      setConfig({ liveEvents: { regions: ["UK"] } as never })
    ).toThrow("GB rather than UK");
    expect(() =>
      setConfig({ liveEvents: { regions: ["GB"] } as never })
    ).not.toThrow();
  });

  it("rejects non-positive intervals and radii", () => {
    expect(() =>
      setConfig({ liveEvents: { sweepRadiusKm: 0 } as never })
    ).toThrow();
    expect(() =>
      setConfig({ liveEvents: { sweepIntervalHours: -1 } as never })
    ).toThrow();
    expect(() =>
      setConfig({ liveEvents: { maxPagesPerRun: 0 } as never })
    ).toThrow();
  });
});

describe("musicbrainz config", () => {
  beforeEach(() => {
    initializeConfig();
  });

  it("defaults to the public server at 1 req/s", () => {
    expect(getConfig().musicbrainz).toEqual(DEFAULT_MUSICBRAINZ);
    expect(getConfig().musicbrainz).toEqual({
      serverUrl: "",
      requestsPerSecond: 1,
    });
  });

  it("normalizes the server URL on save", () => {
    setConfig({ musicbrainz: { serverUrl: " http://mb.local:5000/ws/2/ " } });
    expect(getConfig().musicbrainz.serverUrl).toBe("http://mb.local:5000");
  });

  it("deep-merges a partial patch", () => {
    setConfig({ musicbrainz: { serverUrl: "http://mb.local" } });
    setConfig({ musicbrainz: { requestsPerSecond: 0 } });

    expect(getConfig().musicbrainz).toEqual({
      serverUrl: "http://mb.local",
      requestsPerSecond: 0,
    });
  });

  it("rejects a URL that isn't http or https", () => {
    expect(() =>
      setConfig({ musicbrainz: { serverUrl: "ftp://mb.local" } })
    ).toThrow("musicbrainz.serverUrl");
  });

  it("rejects a negative or excessive pace", () => {
    expect(() => setConfig({ musicbrainz: { requestsPerSecond: -1 } })).toThrow(
      "musicbrainz.requestsPerSecond"
    );
    expect(() =>
      setConfig({ musicbrainz: { requestsPerSecond: 500 } })
    ).toThrow("musicbrainz.requestsPerSecond");
  });

  it("still saves a switch back to the public server with a mirror's pace", () => {
    setConfig({
      musicbrainz: { serverUrl: "http://mb.local", requestsPerSecond: 20 },
    });
    expect(() => setConfig({ musicbrainz: { serverUrl: "" } })).not.toThrow();
  });
});
