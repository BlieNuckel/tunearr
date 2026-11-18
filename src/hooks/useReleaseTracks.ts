import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { Medium } from "../types";
import { responseError } from "@/utils/fetchError";

interface ReleaseTracksResponse {
  media?: Medium[];
}

function tracksKey(releaseGroupId: string, artistName?: string | null) {
  if (!artistName) return releaseGroupId;
  return `${releaseGroupId}?${new URLSearchParams({ artistName }).toString()}`;
}

async function fetchTracks({
  key,
  signal,
}: FetchContext): Promise<ReleaseTracksResponse> {
  const res = await fetch(`/api/musicbrainz/tracks/${key}`, { signal });
  if (!res.ok) throw await responseError(res, "Failed to fetch tracks");
  return res.json();
}

/**
 * Tracks for a release group. The artist name only adds audio previews, so a
 * missing one still loads the tracklist. Pass a null id to wait.
 */
export default function useReleaseTracks(
  releaseGroupId: string | null,
  artistName?: string | null
) {
  const { data, loading, error, errorKind, retrying, refresh } = useAsyncData(
    releaseGroupId === null ? null : tracksKey(releaseGroupId, artistName),
    fetchTracks
  );

  return {
    media: data?.media ?? [],
    loading,
    error,
    errorKind,
    retrying,
    refresh,
  };
}
