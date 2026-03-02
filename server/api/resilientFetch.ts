import { withRetry, type RetryOptions } from "./retry";

export interface ResilientFetchOptions {
  timeoutMs?: number;
  retry?: RetryOptions | boolean;
  fetchFn?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 10000;

export function resilientFetch(
  url: string,
  init?: RequestInit,
  options?: ResilientFetchOptions
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = options?.fetchFn ?? fetch;
  const retryOpt = options?.retry ?? true;

  const retryOptions: RetryOptions | undefined =
    retryOpt === true ? {} : retryOpt === false ? undefined : retryOpt;

  const doFetch = () => {
    const signal = AbortSignal.timeout(timeoutMs);
    return fetchFn(url, { ...init, signal });
  };

  if (!retryOptions) return doFetch();
  return withRetry(doFetch, retryOptions);
}
