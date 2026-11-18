import NodeCache from "node-cache";
import type { MbPriority } from "./queue";
import { getMbServer } from "./server";
import {
  currentLoadContext,
  markLoadFailed,
  newLoadContext,
  runInLoadContext,
  type LoadContext,
} from "./loadContext";
import {
  clearMbCacheStore,
  readStoredEntry,
  writeStoredEntry,
  type StoredEntry,
} from "./store";
import { createLogger } from "../../logger";

/** How long a MusicBrainz value stays fresh, chosen by how volatile the data is. */
export const MB_TTL = {
  /** Facts about one MBID that effectively never change: titles, dates, labels, tracks. */
  immutable: 30 * 24 * 60 * 60,
  /** Entities that get corrected now and then, but don't gain content. */
  slow: 7 * 24 * 60 * 60,
  /** Anything that grows when an artist releases something: searches, discographies. */
  volatile: 6 * 60 * 60,
} as const;

type CacheEntry<T> = StoredEntry & { value: T };

type MbCacheOptions = {
  key: string;
  /** How long the value stays fresh. It is kept, and served on failure, for longer. */
  ttlSeconds: number;
  priority?: MbPriority;
};

type MbLoader<T> = (priority: MbPriority) => Promise<T>;

type RefreshOutcome<T> =
  | { kind: "value"; value: T }
  | { kind: "error"; error: unknown }
  | { kind: "timeout" };

/** How long past its fresh time an entry can still be served when a refresh fails. */
const KEEP_SECONDS = 30 * 24 * 60 * 60;

/** An entity can be added to MusicBrainz, so "not found" is only trusted briefly. */
const NOT_FOUND_FRESH_SECONDS = 10 * 60;

/** A page waits this long for a refresh before it gets the kept value instead. */
const PAGE_REFRESH_WAIT_MS = 1000;

/**
 * Entries fresh for this long or more get a random cut off their fresh time, so
 * a burst of entries cached together isn't refetched together.
 */
const SPREAD_MIN_FRESH_SECONDS = 14 * 24 * 60 * 60;
const SPREAD_MAX_CUT_SECONDS = 3 * 24 * 60 * 60;

const log = createLogger("musicbrainz-cache");

const memory = new NodeCache();

const inFlight = new Map<string, Promise<unknown>>();

function spreadFreshSeconds(freshSeconds: number): number {
  if (freshSeconds < SPREAD_MIN_FRESH_SECONDS) return freshSeconds;
  return freshSeconds - Math.floor(Math.random() * SPREAD_MAX_CUT_SECONDS);
}

function remember<T>(key: string, entry: CacheEntry<T>): void {
  const keepSeconds = Math.ceil((entry.keepUntil - Date.now()) / 1000);
  if (keepSeconds > 0) memory.set(key, entry, keepSeconds);
}

function store<T>(key: string, value: T, freshSeconds: number): void {
  const now = Date.now();
  const freshUntil = now + spreadFreshSeconds(freshSeconds) * 1000;
  const entry: CacheEntry<T> = {
    value,
    freshUntil,
    keepUntil: freshUntil + KEEP_SECONDS * 1000,
    storedAt: now,
  };
  remember(key, entry);
  writeStoredEntry(key, entry);
}

/** Read through memory, then the cache file. */
function readEntry<T>(key: string): CacheEntry<T> | undefined {
  const hot = memory.get<CacheEntry<T>>(key);
  if (hot) return hot;

  const stored = readStoredEntry(key) as CacheEntry<T> | undefined;
  if (stored) remember(key, stored);
  return stored;
}

/**
 * Keys carry the server they were fetched from: a mirror can lag behind or
 * answer differently, and "not found" on one server is no fact about another.
 */
function serverScoped(options: MbCacheOptions): MbCacheOptions {
  return { ...options, key: `${getMbServer().root} ${options.key}` };
}

function storeLoaded<T>(
  options: MbCacheOptions,
  context: LoadContext,
  value: T
): void {
  if (context.failed) {
    log.debug(
      `Not caching ${options.key}: part of it came from a failed or kept call`
    );
    return;
  }
  store(
    options.key,
    value,
    context.notFound ? NOT_FOUND_FRESH_SECONDS : options.ttlSeconds
  );
}

/**
 * Run the loader unless an identical load is already running on the same lane,
 * in which case both callers share its result. Loads are shared per lane so a
 * page never ends up waiting on a load a poller queued on the background lane.
 */
function startLoad<T>(
  options: MbCacheOptions,
  priority: MbPriority,
  loader: MbLoader<T>
): Promise<T> {
  const flightKey = `${priority} ${options.key}`;
  const existing = inFlight.get(flightKey);
  if (existing) return existing as Promise<T>;

  const context = newLoadContext();
  const promise = runInLoadContext(context, () => loader(priority))
    .then((value) => {
      storeLoaded(options, context, value);
      return value;
    })
    .finally(() => {
      inFlight.delete(flightKey);
    });

  inFlight.set(flightKey, promise);
  return promise;
}

function serveKept<T>(
  key: string,
  entry: CacheEntry<T>,
  error: unknown,
  parent: LoadContext | undefined
): T {
  const age = Math.round((Date.now() - entry.storedAt) / 1000);
  log.info(
    `Serving kept value for ${key} (${age}s old): refresh failed with ${error instanceof Error ? error.message : String(error)}`
  );
  markLoadFailed(parent);
  return entry.value;
}

function raceRefresh<T>(refresh: Promise<T>): Promise<RefreshOutcome<T>> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<RefreshOutcome<T>>((resolve) => {
    timer = setTimeout(
      () => resolve({ kind: "timeout" }),
      PAGE_REFRESH_WAIT_MS
    );
  });
  const settled = refresh.then(
    (value): RefreshOutcome<T> => ({ kind: "value", value }),
    (error: unknown): RefreshOutcome<T> => ({ kind: "error", error })
  );
  return Promise.race([settled, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Refresh an entry past its fresh time. A background caller waits for the
 * refresh; a page waits at most PAGE_REFRESH_WAIT_MS and then takes the kept
 * value, while the refresh finishes into the cache. Either way, a failed
 * refresh serves the kept value instead of throwing.
 */
async function refreshStale<T>(
  options: MbCacheOptions,
  priority: MbPriority,
  loader: MbLoader<T>,
  entry: CacheEntry<T>,
  parent: LoadContext | undefined
): Promise<T> {
  const refresh = startLoad(options, priority, loader);

  if (priority === "background") {
    try {
      return await refresh;
    } catch (error) {
      return serveKept(options.key, entry, error, parent);
    }
  }

  const outcome = await raceRefresh(refresh);
  if (outcome.kind === "value") return outcome.value;
  if (outcome.kind === "error") {
    return serveKept(options.key, entry, outcome.error, parent);
  }

  log.debug(`Refresh of ${options.key} is slow; serving the kept value`);
  return entry.value;
}

/**
 * Serve a MusicBrainz value from cache, loading it through the request queue on
 * a miss. Every entry has a fresh time and a longer keep time: past the fresh
 * time it is refreshed, and while kept it stands in for a refresh that fails.
 * Rejections are never cached, so a throttled MusicBrainz can't leave a failure
 * sitting in the cache. A miss with nothing kept still throws.
 */
export function mbCached<T>(
  unscopedOptions: MbCacheOptions,
  loader: MbLoader<T>
): Promise<T> {
  const options = serverScoped(unscopedOptions);
  const priority = options.priority ?? "interactive";
  const parent = currentLoadContext();
  const entry = readEntry<T>(options.key);

  if (entry === undefined) return startLoad(options, priority, loader);
  if (entry.freshUntil > Date.now()) return Promise.resolve(entry.value);

  return refreshStale(options, priority, loader, entry, parent);
}

/**
 * Seed an entry from data we already hold, e.g. one row of a search result,
 * so a later lookup of that entity costs no request. Never overwrites: an
 * existing entry may come from a direct lookup, which is the better source.
 */
export function mbPrime<T>(
  unscopedOptions: Omit<MbCacheOptions, "priority">,
  value: T
): void {
  const options = serverScoped(unscopedOptions);
  if (readEntry(options.key) !== undefined) return;
  store(options.key, value, options.ttlSeconds);
}

/** Drop every cached MusicBrainz value, in memory and on disk. */
export function clearMbCache(): void {
  memory.flushAll();
  inFlight.clear();
  clearMbCacheStore();
}

/** Cached entry count and in-flight load count, for diagnostics. */
export function getMbCacheStats(): { entries: number; inFlight: number } {
  return { entries: memory.keys().length, inFlight: inFlight.size };
}
