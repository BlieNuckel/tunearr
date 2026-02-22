import NodeCache from "node-cache";
import { withRetry, type RetryOptions } from "./retry";

const DEFAULT_TTL = 300;

const DEFAULT_ROLLING_BUFFER = 10000;

export interface ExternalApiOptions {
  baseUrl: string;
  defaultParams?: Record<string, string>;
  defaultHeaders?: Record<string, string>;
  cacheTtlSeconds?: number;
  rateLimitMs?: number;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  retry?: RetryOptions | boolean;
}

export interface RequestConfig {
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ExternalApi {
  get: <T>(
    endpoint: string,
    config?: RequestConfig,
    ttl?: number
  ) => Promise<T>;
  post: <T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: RequestConfig,
    ttl?: number
  ) => Promise<T>;
  getRolling: <T>(
    endpoint: string,
    config?: RequestConfig,
    ttl?: number
  ) => Promise<T>;
  removeCache: (endpoint: string, extra?: Record<string, unknown>) => void;
  clearCache: () => void;
  cache: NodeCache;
}

export function createExternalApi(options: ExternalApiOptions): ExternalApi {
  const cache = new NodeCache({
    stdTTL: options.cacheTtlSeconds ?? DEFAULT_TTL,
  });
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10000;
  const retryOptions: RetryOptions | undefined =
    options.retry === true
      ? {}
      : options.retry === false || options.retry === undefined
        ? undefined
        : options.retry;
  let lastRequestTime = 0;

  const inFlight = new Map<string, Promise<unknown>>();

  function serializeCacheKey(
    endpoint: string,
    extra?: Record<string, unknown>
  ): string {
    if (!extra) {
      return `${options.baseUrl}${endpoint}`;
    }
    // Strip undefined values so {headers: undefined} doesn't affect the key
    const cleaned = Object.fromEntries(
      Object.entries(extra).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(cleaned).length === 0) {
      return `${options.baseUrl}${endpoint}`;
    }
    return `${options.baseUrl}${endpoint}${JSON.stringify(cleaned)}`;
  }

  function buildUrl(endpoint: string, params?: Record<string, string>): string {
    const merged = { ...options.defaultParams, ...params };
    const query = new URLSearchParams(merged).toString();
    return `${options.baseUrl}${endpoint}${query ? "?" + query : ""}`;
  }

  function buildHeaders(
    extra?: Record<string, string>
  ): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.defaultHeaders,
      ...extra,
    };
  }

  async function applyRateLimit(): Promise<void> {
    if (!options.rateLimitMs) return;
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < options.rateLimitMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.rateLimitMs! - elapsed)
      );
    }
    lastRequestTime = Date.now();
  }

  async function fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const signal = AbortSignal.timeout(timeoutMs);
    return fetchFn(url, { ...init, signal });
  }

  function wrapWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (!retryOptions) return fn();
    return withRetry(fn, retryOptions);
  }

  async function get<T>(
    endpoint: string,
    config?: RequestConfig,
    ttl?: number
  ): Promise<T> {
    const cacheKey = serializeCacheKey(endpoint, {
      ...config?.params,
      headers: config?.headers,
    });
    const cached = cache.get<T>(cacheKey);
    if (cached !== undefined) return cached;

    const existing = inFlight.get(cacheKey);
    if (existing) return existing as Promise<T>;

    const promise = wrapWithRetry(async () => {
      await applyRateLimit();
      const url = buildUrl(endpoint, config?.params);
      const response = await fetchWithTimeout(url, {
        headers: buildHeaders(config?.headers),
      });
      const data: T = await response.json();

      if (ttl !== 0) {
        cache.set(cacheKey, data, ttl ?? DEFAULT_TTL);
      }

      return data;
    });

    inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      inFlight.delete(cacheKey);
    }
  }

  async function post<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: RequestConfig,
    ttl?: number
  ): Promise<T> {
    const cacheKey = serializeCacheKey(endpoint, {
      config: config?.params,
      ...(data ? { data } : {}),
    });
    const cached = cache.get<T>(cacheKey);
    if (cached !== undefined) return cached;

    return wrapWithRetry(async () => {
      await applyRateLimit();
      const url = buildUrl(endpoint, config?.params);
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: buildHeaders(config?.headers),
        body: JSON.stringify(data),
      });
      const result: T = await response.json();

      if (ttl !== 0) {
        cache.set(cacheKey, result, ttl ?? DEFAULT_TTL);
      }

      return result;
    });
  }

  async function getRolling<T>(
    endpoint: string,
    config?: RequestConfig,
    ttl?: number
  ): Promise<T> {
    const effectiveTtl = ttl ?? DEFAULT_TTL;
    const cacheKey = serializeCacheKey(endpoint, {
      ...config?.params,
      headers: config?.headers,
    });
    const cached = cache.get<T>(cacheKey);

    if (cached !== undefined) {
      const keyTtl = cache.getTtl(cacheKey) ?? 0;

      if (keyTtl - effectiveTtl * 1000 < Date.now() - DEFAULT_ROLLING_BUFFER) {
        applyRateLimit().then(() => {
          const url = buildUrl(endpoint, config?.params);
          fetchWithTimeout(url, { headers: buildHeaders(config?.headers) })
            .then((response) => response.json())
            .then((data: T) => {
              cache.set(cacheKey, data, effectiveTtl);
            })
            .catch(() => {
              // this is fine, stale data is still served
            });
        });
      }
      return cached;
    }

    const existing = inFlight.get(cacheKey);
    if (existing) return existing as Promise<T>;

    const promise = wrapWithRetry(async () => {
      await applyRateLimit();
      const url = buildUrl(endpoint, config?.params);
      const response = await fetchWithTimeout(url, {
        headers: buildHeaders(config?.headers),
      });
      const data: T = await response.json();

      if (ttl !== 0) {
        cache.set(cacheKey, data, effectiveTtl);
      }

      return data;
    });

    inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      inFlight.delete(cacheKey);
    }
  }

  function removeCache(
    endpoint: string,
    extra?: Record<string, unknown>
  ): void {
    const cacheKey = serializeCacheKey(endpoint, extra);
    cache.del(cacheKey);
  }

  function clearCache(): void {
    cache.flushAll();
  }

  return { get, post, getRolling, removeCache, clearCache, cache };
}
