import { useState, useCallback } from "react";

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

type SSEEvent =
  | { type: "progress"; data: ProgressEvent }
  | { type: "result"; data: PurchaseContext };

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

export default function usePurchaseContext() {
  const [context, setContext] = useState<PurchaseContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);

  const fetchContext = useCallback(async (releaseGroupId: string) => {
    setLoading(true);
    setProgress(null);
    setContext(null);

    try {
      const res = await fetch(
        `/api/musicbrainz/purchase-context/${releaseGroupId}`
      );
      if (!res.ok || !res.body) {
        setContext(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseSSEEvents(buffer);
        buffer = remainder;

        for (const event of events) {
          if (event.type === "progress") {
            setProgress(event.data);
          } else if (event.type === "result") {
            setContext(event.data);
          }
        }
      }
    } catch {
      setContext(null);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  const reset = useCallback(() => {
    setContext(null);
    setProgress(null);
  }, []);

  return { context, loading, progress, fetchContext, reset };
}
