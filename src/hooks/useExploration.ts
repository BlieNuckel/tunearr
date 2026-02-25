import { useState, useCallback } from "react";
import type { ReleaseGroup } from "../types";

type ExplorationPhase = "search" | "round" | "complete";

type TagWeight = {
  name: string;
  count: number;
};

type ExplorationSuggestion = {
  releaseGroup: ReleaseGroup;
  tag: string;
};

export type CollectedAlbum = {
  releaseGroup: ReleaseGroup;
  tag?: string;
};

type SuggestionsResponse = {
  suggestions: ExplorationSuggestion[];
  newTags: TagWeight[];
};

async function fetchSuggestions(
  artistName: string,
  albumName: string,
  albumMbid: string,
  excludeMbids: string[],
  accumulatedTags: TagWeight[]
): Promise<SuggestionsResponse> {
  const res = await fetch("/api/exploration/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      artistName,
      albumName,
      albumMbid,
      excludeMbids,
      accumulatedTags,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to fetch suggestions");
  }

  return res.json();
}

function getExcludeMbids(collected: CollectedAlbum[]): string[] {
  return collected.map((c) => c.releaseGroup.id);
}

function getArtistName(rg: ReleaseGroup): string {
  return rg["artist-credit"]?.[0]?.artist?.name || "Unknown Artist";
}

export default function useExploration() {
  const [phase, setPhase] = useState<ExplorationPhase>("search");
  const [round, setRound] = useState(0);
  const [collectedAlbums, setCollectedAlbums] = useState<CollectedAlbum[]>([]);
  const [suggestions, setSuggestions] = useState<ExplorationSuggestion[]>([]);
  const [accumulatedTags, setAccumulatedTags] = useState<TagWeight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestions = useCallback(
    async (source: ReleaseGroup, collected: CollectedAlbum[], tags: TagWeight[]) => {
      setLoading(true);
      setError(null);
      setSuggestions([]);

      try {
        const result = await fetchSuggestions(
          getArtistName(source),
          source.title,
          source.id,
          getExcludeMbids(collected),
          tags
        );

        setSuggestions(result.suggestions);
        setAccumulatedTags(result.newTags);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load suggestions");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const startExploration = useCallback(
    (sourceAlbum: ReleaseGroup) => {
      const collected = [{ releaseGroup: sourceAlbum }];
      setCollectedAlbums(collected);
      setRound(1);
      setPhase("round");
      setAccumulatedTags([]);
      loadSuggestions(sourceAlbum, collected, []);
    },
    [loadSuggestions]
  );

  const selectSuggestion = useCallback(
    (index: number) => {
      const suggestion = suggestions[index];
      if (!suggestion) return;

      const newCollected = [
        ...collectedAlbums,
        { releaseGroup: suggestion.releaseGroup, tag: suggestion.tag },
      ];
      setCollectedAlbums(newCollected);

      if (round >= 5) {
        setPhase("complete");
        return;
      }

      const nextRound = round + 1;
      setRound(nextRound);
      loadSuggestions(suggestion.releaseGroup, newCollected, accumulatedTags);
    },
    [suggestions, collectedAlbums, round, accumulatedTags, loadSuggestions]
  );

  const reset = useCallback(() => {
    setPhase("search");
    setRound(0);
    setCollectedAlbums([]);
    setSuggestions([]);
    setAccumulatedTags([]);
    setLoading(false);
    setError(null);
  }, []);

  return {
    phase,
    round,
    collectedAlbums,
    suggestions,
    accumulatedTags,
    loading,
    error,
    startExploration,
    selectSuggestion,
    reset,
  };
}
