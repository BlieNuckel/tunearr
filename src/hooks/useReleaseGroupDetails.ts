import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { AlbumDetails } from "../types";
import { responseError } from "@/utils/fetchError";

interface AlbumDetailsResponse {
  album: AlbumDetails;
}

async function fetchAlbumDetails({
  key,
  signal,
}: FetchContext): Promise<AlbumDetailsResponse> {
  const res = await fetch(`/api/musicbrainz/album/${key}`, { signal });
  if (!res.ok) throw await responseError(res, "Failed to load album");
  return res.json();
}

export default function useReleaseGroupDetails(mbid: string | undefined) {
  const { data, loading, error, errorKind, retrying, refresh } = useAsyncData(
    mbid ?? null,
    fetchAlbumDetails
  );

  return {
    album: data?.album ?? null,
    loading,
    error,
    errorKind,
    retrying,
    refresh,
  };
}
