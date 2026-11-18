import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { ReleaseGroup } from "../types";
import { responseError } from "@/utils/fetchError";

interface ArtistReleaseGroupsResponse {
  releaseGroups: ReleaseGroup[];
}

async function fetchArtistReleaseGroups({
  key,
  signal,
}: FetchContext): Promise<ArtistReleaseGroupsResponse> {
  const res = await fetch(`/api/musicbrainz/artist/${key}/release-groups`, {
    signal,
  });
  if (!res.ok) throw await responseError(res, "Failed to load discography");
  return res.json();
}

export default function useArtistReleaseGroups(
  artistMbid: string | null | undefined
) {
  const { data, loading, error, errorKind, retrying, refresh } = useAsyncData(
    artistMbid ?? null,
    fetchArtistReleaseGroups
  );

  return {
    releaseGroups: data?.releaseGroups ?? [],
    loading,
    error,
    errorKind,
    retrying,
    refresh,
  };
}
