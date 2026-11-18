import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "../../logger";

/**
 * A cached MusicBrainz answer. `freshUntil` is when to refresh it; `keepUntil`
 * is how long it may still be served when a refresh fails.
 */
export type StoredEntry = {
  value: unknown;
  freshUntil: number;
  keepUntil: number;
  storedAt: number;
};

type EntryRow = {
  value: string;
  fresh_until: number;
  keep_until: number;
  stored_at: number;
};

const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const log = createLogger("musicbrainz-cache");

let db: Database.Database | null = null;
let pruneTimer: NodeJS.Timeout | null = null;
let pending = new Map<string, StoredEntry>();
let flushScheduled = false;

function createSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS mb_cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      fresh_until INTEGER NOT NULL,
      keep_until INTEGER NOT NULL,
      stored_at INTEGER NOT NULL
    )
  `);
}

/** `mb-cache.db` next to the main database in the config directory. */
export function defaultMbCachePath(): string {
  const configDir =
    process.env.APP_CONFIG_DIR ||
    path.join(__dirname, "..", "..", "..", "config");
  return path.join(configDir, "mb-cache.db");
}

/**
 * Open the cache file. Cached MusicBrainz answers are disposable, so they live
 * in their own file: out of migrations and backups, and deletable without
 * touching user data. A file that won't open leaves the cache memory-only; it
 * never stops the app.
 */
export function openMbCacheStore(filePath: string): boolean {
  closeMbCacheStore();
  try {
    const database = new Database(filePath);
    database.pragma("journal_mode = WAL");
    createSchema(database);
    db = database;
  } catch (err) {
    log.error(
      `Could not open the MusicBrainz cache at ${filePath}; caching in memory only`,
      err
    );
    return false;
  }

  pruneMbCacheStore();
  pruneTimer = setInterval(pruneMbCacheStore, PRUNE_INTERVAL_MS);
  pruneTimer.unref();
  log.info(`MusicBrainz cache opened at ${filePath}`);
  return true;
}

export function closeMbCacheStore(): void {
  if (pruneTimer) clearInterval(pruneTimer);
  pruneTimer = null;
  flushPending();
  db?.close();
  db = null;
}

/** An entry that can still be served, or undefined. */
export function readStoredEntry(key: string): StoredEntry | undefined {
  const queued = pending.get(key);
  if (queued) return queued;
  if (!db) return undefined;

  try {
    const row = db
      .prepare(
        "SELECT value, fresh_until, keep_until, stored_at FROM mb_cache WHERE key = ?"
      )
      .get(key) as EntryRow | undefined;
    if (!row || row.keep_until <= Date.now()) return undefined;

    return {
      value: JSON.parse(row.value),
      freshUntil: row.fresh_until,
      keepUntil: row.keep_until,
      storedAt: row.stored_at,
    };
  } catch (err) {
    log.warn(`Could not read MusicBrainz cache entry ${key}`, err);
    return undefined;
  }
}

function flushPending(): void {
  flushScheduled = false;
  const batch = pending;
  pending = new Map();
  if (!db || batch.size === 0) return;

  try {
    const insert = db.prepare(
      "INSERT OR REPLACE INTO mb_cache (key, value, fresh_until, keep_until, stored_at) VALUES (?, ?, ?, ?, ?)"
    );
    db.transaction(() => {
      for (const [key, entry] of batch) {
        insert.run(
          key,
          JSON.stringify(entry.value),
          entry.freshUntil,
          entry.keepUntil,
          entry.storedAt
        );
      }
    })();
  } catch (err) {
    log.warn(`Could not write ${batch.size} MusicBrainz cache entries`, err);
  }
}

/**
 * Queue a write. Writes are batched into one transaction on the next tick, so a
 * response never waits on the disk.
 */
export function writeStoredEntry(key: string, entry: StoredEntry): void {
  if (!db) return;
  pending.set(key, entry);
  if (!flushScheduled) {
    flushScheduled = true;
    setImmediate(flushPending);
  }
}

/** Delete entries past their keep time. Returns how many went. */
export function pruneMbCacheStore(): number {
  if (!db) return 0;
  try {
    const result = db
      .prepare("DELETE FROM mb_cache WHERE keep_until <= ?")
      .run(Date.now());
    if (result.changes > 0) {
      log.info(`Pruned ${result.changes} expired MusicBrainz cache entries`);
    }
    return result.changes;
  } catch (err) {
    log.warn("Could not prune the MusicBrainz cache", err);
    return 0;
  }
}

export function clearMbCacheStore(): void {
  pending = new Map();
  if (!db) return;
  try {
    db.prepare("DELETE FROM mb_cache").run();
  } catch (err) {
    log.warn("Could not clear the MusicBrainz cache", err);
  }
}

/** Write anything queued now. Test support and shutdown. */
export function flushMbCacheStore(): void {
  flushPending();
}
