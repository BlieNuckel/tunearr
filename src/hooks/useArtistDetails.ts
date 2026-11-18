import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { ArtistDetails } from "../types";
import { responseError } from "@/utils/fetchError";

interface ArtistDetailsResponse {
  artist: ArtistDetails;
}

async function fetchArtistDetails({
  key,
  signal,
}: FetchContext): Promise<ArtistDetailsResponse> {
  const res = await fetch(`/api/musicbrainz/artist/${key}`, { signal });
  if (!res.ok) throw await responseError(res, "Failed to load artist");
  return res.json();
}

export default function useArtistDetails(mbid: string | undefined) {
  const { data, loading, error, errorKind, retrying, refresh } = useAsyncData(
    mbid ?? null,
    fetchArtistDetails
  );

  return {
    artist: data?.artist ?? null,
    loading,
    error,
    errorKind,
    retrying,
    refresh,
  };
}
