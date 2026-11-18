import type {
  AlbumDetails,
  ArtistDetails,
  ReleaseHighlight,
  ReleaseGroup,
  RequestHighlight,
} from "@/types";

/**
 * What a card already shows about the album or artist it links to, carried in
 * router state so the page can draw its header before any request returns.
 */
export type NavPreviewState = {
  albumPreview?: AlbumDetails;
  artistPreview?: ArtistDetails;
};

export function albumPreviewFromReleaseGroup(rg: ReleaseGroup): AlbumDetails {
  const credit = rg["artist-credit"]?.[0];
  return {
    mbid: rg.id,
    title: rg.title,
    artistName: credit?.name || credit?.artist?.name || "Unknown Artist",
    artistMbid: credit?.artist?.id || null,
    firstReleaseDate: rg["first-release-date"] || null,
    primaryType: rg["primary-type"] || null,
    secondaryTypes: rg["secondary-types"] ?? [],
  };
}

export function albumPreviewFromReleaseHighlight(
  item: ReleaseHighlight & { releaseGroupMbid: string }
): AlbumDetails {
  return {
    mbid: item.releaseGroupMbid,
    title: item.title,
    artistName: item.artistName,
    artistMbid: item.artistMbid,
    firstReleaseDate: item.releaseDate,
    primaryType: item.releaseType,
    secondaryTypes: [],
  };
}

export function albumPreviewFromRequestHighlight(
  item: RequestHighlight
): AlbumDetails {
  return {
    mbid: item.albumMbid,
    title: item.title,
    artistName: item.artistName,
    artistMbid: null,
    firstReleaseDate: null,
    primaryType: null,
    secondaryTypes: [],
  };
}

export function albumNavState(album: AlbumDetails): NavPreviewState {
  return { albumPreview: album };
}

export function artistNavState(artist: ArtistDetails): NavPreviewState {
  return { artistPreview: artist };
}

/**
 * The preview for this album, if the page was reached from a card. Ignored when
 * it names another album, e.g. state left over in history.
 */
export function readAlbumPreview(
  state: unknown,
  mbid: string | undefined
): AlbumDetails | null {
  const preview = (state as NavPreviewState | null)?.albumPreview;
  if (!preview || !mbid || preview.mbid !== mbid) return null;
  return preview;
}

export function readArtistPreview(
  state: unknown,
  mbid: string | undefined
): ArtistDetails | null {
  const preview = (state as NavPreviewState | null)?.artistPreview;
  if (!preview || !mbid || preview.mbid !== mbid) return null;
  return preview;
}
