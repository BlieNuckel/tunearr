import { useState, useEffect, useRef, useCallback } from "react";
import {
  errorKindOf,
  isRetryableError,
  type ErrorKind,
} from "@/utils/fetchError";

export type FetchContext = {
  key: string;
  refresh: boolean;
  /**
   * Aborted when the key changes, a refresh supersedes this run, or the component
   * unmounts. Pass it to `fetch` so the request actually stops instead of merely
   * having its result discarded.
   */
  signal: AbortSignal;
};

export type UseAsyncDataReturn<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** What kind of failure `error` is, for choosing its copy. */
  errorKind: ErrorKind | null;
  /** A retryable failure is being retried on its own; `error` holds the last one. */
  retrying: boolean;
  refresh: () => Promise<void>;
  setData: (updater: (prev: T) => T) => void;
};

type AsyncResult<T> = {
  key: string | null;
  nonce: number;
  data: T | null;
  error: string | null;
  errorKind: ErrorKind | null;
  retryScheduled: boolean;
};

/** Automatic retries of a retryable error before it is left to the user. */
export const MAX_AUTO_RETRIES = 3;

const DEFAULT_RETRY_DELAY_MS = 2000;
const MIN_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 15_000;

/** Starts from what the server asked for and doubles per attempt. */
function retryDelayMs(retryAfterMs: number | undefined, attempt: number) {
  const base = Math.max(
    retryAfterMs ?? DEFAULT_RETRY_DELAY_MS,
    MIN_RETRY_DELAY_MS
  );
  return Math.min(base * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

/**
 * Generic key-driven data fetching hook.
 *
 * - `key` identifies the request; changing it triggers a new fetch. Pass
 *   `null` to disable fetching (data/error are exposed as null).
 * - `loading` is derived from key/nonce mismatch, so no state is set
 *   synchronously in effects (react-hooks/set-state-in-effect compliant).
 * - Stale responses from superseded fetches are discarded, and the request behind
 *   them is aborted via the `signal` on the fetch context.
 * - On error the previous data is kept; `error` is masked while a newer
 *   fetch is in flight.
 * - `refresh()` refetches the current key and resolves when it settles;
 *   the fetcher receives `refresh: true` for that run.
 * - `setData` applies local mutations (e.g. optimistic list updates).
 * - An error marked retryable (a busy MusicBrainz) is retried on its own, after
 *   the delay the server asked for and doubling, up to MAX_AUTO_RETRIES times.
 *   `retrying` is true from the failure until a retry settles. A key change or
 *   `refresh()` starts the count over.
 */
export default function useAsyncData<T>(
  key: string | null,
  fetcher: (ctx: FetchContext) => Promise<T>
): UseAsyncDataReturn<T> {
  const [result, setResult] = useState<AsyncResult<T>>({
    key: null,
    nonce: 0,
    data: null,
    error: null,
    errorKind: null,
    retryScheduled: false,
  });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  const refreshRequestedRef = useRef(false);
  const autoRetryRequestedRef = useRef(false);
  const autoRetriesRef = useRef(0);
  const refreshResolversRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) {
      refreshResolversRef.current.splice(0).forEach((resolve) => resolve());
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const isRefresh = refreshRequestedRef.current;
    refreshRequestedRef.current = false;
    if (!autoRetryRequestedRef.current) autoRetriesRef.current = 0;
    autoRetryRequestedRef.current = false;

    const scheduleRetry = (err: unknown): boolean => {
      if (!isRetryableError(err)) return false;
      if (autoRetriesRef.current >= MAX_AUTO_RETRIES) return false;

      const delay = retryDelayMs(err.retryAfterMs, autoRetriesRef.current);
      autoRetriesRef.current += 1;
      retryTimer = setTimeout(() => {
        autoRetryRequestedRef.current = true;
        setNonce((n) => n + 1);
      }, delay);
      return true;
    };

    const run = async () => {
      try {
        const data = await fetcherRef.current({
          key,
          refresh: isRefresh,
          signal: controller.signal,
        });
        if (!cancelled) {
          setResult({
            key,
            nonce,
            data,
            error: null,
            errorKind: null,
            retryScheduled: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const retryScheduled = scheduleRetry(err);
          setResult((prev) => ({
            key,
            nonce,
            data: prev.data,
            error: err instanceof Error ? err.message : "Request failed",
            errorKind: errorKindOf(err),
            retryScheduled,
          }));
        }
      } finally {
        if (!cancelled) {
          refreshResolversRef.current.splice(0).forEach((resolve) => resolve());
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      controller.abort();
    };
  }, [key, nonce]);

  const refresh = useCallback(() => {
    refreshRequestedRef.current = true;
    setNonce((n) => n + 1);
    return new Promise<void>((resolve) => {
      refreshResolversRef.current.push(resolve);
    });
  }, []);

  const setData = useCallback((updater: (prev: T) => T) => {
    setResult((prev) =>
      prev.data === null ? prev : { ...prev, data: updater(prev.data) }
    );
  }, []);

  const loading =
    key !== null && (result.key !== key || result.nonce !== nonce);
  const retrying = key !== null && result.key === key && result.retryScheduled;
  const showError = key !== null && !loading;

  return {
    data: key === null ? null : result.data,
    loading,
    error: showError ? result.error : null,
    errorKind: showError ? result.errorKind : null,
    retrying,
    refresh,
    setData,
  };
}
