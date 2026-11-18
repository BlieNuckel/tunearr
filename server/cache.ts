import NodeCache from "node-cache";

export type CachedFn<TArgs extends unknown[], TReturn> = ((
  ...args: TArgs
) => Promise<TReturn>) & { clearCache: () => void };

/**
 * Wraps an async function with caching. On cache hit, returns the cached value
 * without calling the underlying function. Concurrent calls for the same key
 * share one run, so a burst (or React StrictMode's double effect) does the work
 * once. A rejection is shared with the callers waiting on it but never cached.
 * @param fn - The async function to wrap
 * @param options.cache - NodeCache instance to use
 * @param options.key - Function to derive a cache key from the arguments
 * @param options.ttlMs - Time-to-live in milliseconds for cached entries
 */
export function withCache<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    cache: NodeCache;
    key: (...args: TArgs) => string;
    ttlMs: number;
    label?: string;
  }
): CachedFn<TArgs, TReturn> {
  const ttlSeconds = Math.ceil(options.ttlMs / 1000);
  const inFlight = new Map<string, Promise<TReturn>>();

  const wrapped = async (...args: TArgs): Promise<TReturn> => {
    const cacheKey = options.key(...args);
    const cached = options.cache.get<TReturn>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const running = inFlight.get(cacheKey);
    if (running) return running;

    const run = fn(...args)
      .then((result) => {
        options.cache.set(cacheKey, result, ttlSeconds);
        return result;
      })
      .finally(() => {
        inFlight.delete(cacheKey);
      });
    inFlight.set(cacheKey, run);
    return run;
  };

  wrapped.clearCache = () => {
    options.cache.flushAll();
    inFlight.clear();
  };

  return wrapped as CachedFn<TArgs, TReturn>;
}
