import { useState, useCallback, useEffect, useRef } from "react";

export type Recommendation = "buy" | "request" | "neutral";

export type Signal = {
  factor: string;
  recommendation: Recommendation;
  reason: string;
};

export type LabelInfo = {
  name: string;
  mbid: string;
};

export type PurchaseContext = {
  recommendation: Recommendation;
  signals: Signal[];
  label: LabelInfo | null;
};

type ProgressEvent = {
  step: string;
  detail?: string;
};

type BusyEvent = {
  error: string;
  retryable: boolean;
  retryAfterMs?: number;
};

type SSEEvent =
  | { type: "progress"; data: ProgressEvent }
  | { type: "result"; data: PurchaseContext }
  | { type: "error"; data: BusyEvent };

type StreamHandlers = {
  onProgress: (progress: ProgressEvent) => void;
  onResult: (context: PurchaseContext) => void;
};

/** Automatic retries when MusicBrainz is busy before the user is asked. */
const MAX_AUTO_RETRIES = 3;
const MIN_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 15_000;

function parseSSEEvents(text: string): {
  events: SSEEvent[];
  remainder: string;
} {
  const events: SSEEvent[] = [];
  const blocks = text.split("\n\n");
  const remainder = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventType = "";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) eventType = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (!eventType || !data) continue;
    try {
      events.push({ type: eventType, data: JSON.parse(data) } as SSEEvent);
    } catch {
      // skip malformed events
    }
  }

  return { events, remainder };
}

/** Read the stream to its end. Returns the busy event when the server sent one. */
async function readPurchaseStream(
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlers
): Promise<BusyEvent | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let busy: BusyEvent | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, remainder } = parseSSEEvents(buffer);
    buffer = remainder;

    for (const event of events) {
      if (event.type === "progress") handlers.onProgress(event.data);
      else if (event.type === "result") handlers.onResult(event.data);
      else if (event.type === "error") busy = event.data;
    }
  }

  return busy;
}

function retryDelayMs(retryAfterMs: number | undefined, attempt: number) {
  const base = Math.max(retryAfterMs ?? MIN_RETRY_DELAY_MS, MIN_RETRY_DELAY_MS);
  return Math.min(base * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

/**
 * Streams the buy-vs-request evaluation for an album. When MusicBrainz is busy
 * the server says so instead of guessing, and this retries on its own a few
 * times before exposing the error with a manual `retry`.
 */
export default function usePurchaseContext() {
  const [context, setContext] = useState<PurchaseContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const releaseGroupRef = useRef<string | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadRef = useRef<(releaseGroupId: string) => Promise<void>>(() =>
    Promise.resolve()
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const load = useCallback(async (releaseGroupId: string) => {
    setLoading(true);
    setProgress(null);
    setContext(null);
    let busy: BusyEvent | null = null;

    try {
      const res = await fetch(
        `/api/musicbrainz/purchase-context/${releaseGroupId}`
      );
      if (res.ok && res.body) {
        busy = await readPurchaseStream(res.body, {
          onProgress: setProgress,
          onResult: setContext,
        });
      }
    } catch {
      setContext(null);
    } finally {
      setLoading(false);
      setProgress(null);
    }

    if (releaseGroupRef.current !== releaseGroupId) return;
    if (!busy) {
      setError(null);
      setRetrying(false);
      return;
    }

    setError(busy.error);
    const canRetry = busy.retryable && attemptsRef.current < MAX_AUTO_RETRIES;
    setRetrying(canRetry);
    if (!canRetry) return;

    const delay = retryDelayMs(busy.retryAfterMs, attemptsRef.current);
    attemptsRef.current += 1;
    timerRef.current = setTimeout(() => {
      void loadRef.current(releaseGroupId);
    }, delay);
  }, []);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const fetchContext = useCallback(
    async (releaseGroupId: string) => {
      clearTimeout(timerRef.current);
      releaseGroupRef.current = releaseGroupId;
      attemptsRef.current = 0;
      setError(null);
      setRetrying(false);
      await load(releaseGroupId);
    },
    [load]
  );

  const retry = useCallback(() => {
    if (releaseGroupRef.current) void fetchContext(releaseGroupRef.current);
  }, [fetchContext]);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    releaseGroupRef.current = null;
    setContext(null);
    setProgress(null);
    setError(null);
    setRetrying(false);
  }, []);

  return {
    context,
    loading,
    progress,
    error,
    retrying,
    fetchContext,
    retry,
    reset,
  };
}
