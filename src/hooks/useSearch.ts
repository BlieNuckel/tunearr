import { useState, useCallback, useEffect, useRef } from "react";
import { ArtistSearchResult, ReleaseGroup } from "../types";
import { isRetryableError, responseError } from "@/utils/fetchError";

export type SearchPart = "albums" | "artists";

type SearchResponse = {
  "release-groups"?: ReleaseGroup[];
  artists?: ArtistSearchResult[];
  partial?: SearchPart[];
  retryAfterMs?: number;
};

const ALL_PARTS: SearchPart[] = ["albums", "artists"];

/** Times a missing part is asked for again before the user is asked. */
const MAX_AUTO_RETRIES = 3;
const MIN_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 15_000;

function retryDelayMs(retryAfterMs: number | undefined, attempt: number) {
  const base = Math.max(retryAfterMs ?? MIN_RETRY_DELAY_MS, MIN_RETRY_DELAY_MS);
  return Math.min(base * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

async function fetchSearch(
  query: string,
  parts: SearchPart[]
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (parts.length < ALL_PARTS.length) params.set("parts", parts.join(","));
  const res = await fetch(`/api/musicbrainz/search/all?${params.toString()}`);
  if (!res.ok) throw await responseError(res, "Search failed");
  return res.json();
}

/**
 * Album and artist search. The server returns whatever made it in time and
 * lists the rest in `partial`; those parts are asked for again on their own,
 * so a slow artist search never holds back album results. `missing` lists the
 * parts still absent, `retrying` says whether they are still being retried,
 * and `retryMissing` asks again once automatic retries run out.
 */
export default function useSearch() {
  const [albums, setAlbums] = useState<ReleaseGroup[]>([]);
  const [artists, setArtists] = useState<ArtistSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<SearchPart[]>([]);
  const [retrying, setRetrying] = useState(false);
  const queryRef = useRef<string | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestRef = useRef<
    (query: string, parts: SearchPart[]) => Promise<void>
  >(() => Promise.resolve());

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const applyMissing = useCallback(
    (query: string, parts: SearchPart[], retryAfterMs?: number) => {
      setMissing(parts);
      const canRetry =
        parts.length > 0 && attemptsRef.current < MAX_AUTO_RETRIES;
      setRetrying(canRetry);
      if (!canRetry) return;

      const delay = retryDelayMs(retryAfterMs, attemptsRef.current);
      attemptsRef.current += 1;
      timerRef.current = setTimeout(() => {
        void requestRef.current(query, parts);
      }, delay);
    },
    []
  );

  const request = useCallback(
    async (query: string, parts: SearchPart[]) => {
      try {
        const data = await fetchSearch(query, parts);
        if (queryRef.current !== query) return;

        const partial = data.partial ?? [];
        if (parts.includes("albums") && !partial.includes("albums")) {
          setAlbums(data["release-groups"] ?? []);
        }
        if (parts.includes("artists") && !partial.includes("artists")) {
          setArtists(data.artists ?? []);
        }
        applyMissing(query, partial, data.retryAfterMs);
      } catch (err) {
        if (queryRef.current !== query) return;
        if (isRetryableError(err)) {
          applyMissing(query, parts, err.retryAfterMs);
          return;
        }
        setError(err instanceof Error ? err.message : "Search failed");
        setMissing([]);
        setRetrying(false);
      }
    },
    [applyMissing]
  );

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      clearTimeout(timerRef.current);
      queryRef.current = query;
      attemptsRef.current = 0;
      setLoading(true);
      setError(null);
      setAlbums([]);
      setArtists([]);
      setMissing([]);
      setRetrying(false);

      try {
        await request(query, ALL_PARTS);
      } finally {
        if (queryRef.current === query) setLoading(false);
      }
    },
    [request]
  );

  const retryMissing = useCallback(() => {
    const query = queryRef.current;
    if (!query || missing.length === 0) return;
    clearTimeout(timerRef.current);
    attemptsRef.current = 0;
    setRetrying(true);
    void request(query, missing);
  }, [missing, request]);

  return {
    albums,
    artists,
    loading,
    error,
    missing,
    retrying,
    search,
    retryMissing,
  };
}
