import NodeCache from "node-cache";

export type CachedFn<TArgs extends unknown[], TReturn> = ((
  ...args: TArgs
) => Promise<TReturn>) & { clearCache: () => void };

/**
 * Wraps an async function with caching. On cache hit, returns the cached value
 * without calling the underlying function.
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

  const wrapped = async (...args: TArgs): Promise<TReturn> => {
    const cacheKey = options.key(...args);
    const cached = options.cache.get<TReturn>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn(...args);
    options.cache.set(cacheKey, result, ttlSeconds);
    return result;
  };

  wrapped.clearCache = () => options.cache.flushAll();

  return wrapped as CachedFn<TArgs, TReturn>;
}
