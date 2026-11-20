import { useCallback } from "react";
import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type {
  Highlight,
  HighlightsData,
  LiveHighlight,
  ReleaseHighlight,
} from "@/types";

async function fetchHighlights({
  signal,
}: FetchContext): Promise<HighlightsData> {
  const res = await fetch("/api/highlights", { signal });
  if (!res.ok) throw new Error("Failed to fetch highlights");
  return res.json();
}

function sourceId(highlight: Highlight): number {
  if (highlight.kind === "release") return highlight.followedReleaseId;
  if (highlight.kind === "request") return highlight.requestId;
  return highlight.id;
}

function withoutHighlight(prev: HighlightsData, key: string): HighlightsData {
  return { items: prev.items.filter((item) => item.key !== key) };
}

function withReleaseSeen(prev: HighlightsData, key: string): HighlightsData {
  return {
    items: prev.items.map((item) =>
      item.key === key && item.kind === "release"
        ? { ...item, unseen: false }
        : item
    ),
  };
}

/** A failed write is put right by the refresh that follows it. */
async function post(url: string, body?: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  }).catch(() => {});
}

export default function useHighlights() {
  const { data, loading, error, errorKind, retrying, refresh, setData } =
    useAsyncData<HighlightsData>("highlights", fetchHighlights);

  /**
   * Removes the highlight at once and then refetches, which also brings in the
   * next one in line to fill the space.
   */
  const dismiss = useCallback(
    async (highlight: Highlight) => {
      setData((prev) => withoutHighlight(prev, highlight.key));
      await post(
        `/api/highlights/${highlight.kind}/${sourceId(highlight)}/dismiss`
      );
      void refresh();
    },
    [refresh, setData]
  );

  /**
   * Going answers the card for its closest date, so the artist leaves Home like
   * a dismissal until a closer date turns up.
   */
  const markGoing = useCallback(
    async (highlight: LiveHighlight) => {
      if (!highlight.closest) return;
      setData((prev) => withoutHighlight(prev, highlight.key));
      await post(`/api/live/events/${highlight.closest.id}/response`, {
        response: "going",
      });
      await post(`/api/highlights/live/${highlight.id}/dismiss`);
      void refresh();
    },
    [refresh, setData]
  );

  /** Opening a release makes it old news; it stays until dismissed or aged out. */
  const markSeen = useCallback(
    (highlight: ReleaseHighlight) => {
      if (!highlight.unseen) return;
      setData((prev) => withReleaseSeen(prev, highlight.key));
      void post(`/api/followed/releases/${highlight.followedReleaseId}/viewed`);
    },
    [setData]
  );

  return {
    highlights: data?.items ?? null,
    loading,
    error,
    errorKind,
    retrying,
    refresh,
    dismiss,
    markGoing,
    markSeen,
  };
}
