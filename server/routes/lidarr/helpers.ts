import { getConfigValue } from "../../config";
import { lidarrGet } from "../../lidarrApi/get";
import { lidarrPost } from "../../lidarrApi/post";
import {
  LidarrAlbum,
  LidarrArtist,
  extractLidarrError,
} from "../../lidarrApi/types";

export const getAlbumByMbid = async (albumMbid: string) => {
  const result = await lidarrGet<LidarrAlbum[]>("/album/lookup", {
    term: `lidarr:${albumMbid}`,
  });

  if (result.status !== 200 || !result.data?.length) {
    throw new Error("Album not found");
  }
  return result.data[0];
};

const addAlbumToLidarr = async (albumMbid: string, artist: LidarrArtist) => {
  const album = await getAlbumByMbid(albumMbid);

  const addAlbumResult = await lidarrPost<LidarrAlbum>("/album", {
    ...album,
    artist,
    monitored: true,
    addOptions: { searchForNewAlbum: true },
  });

  if (addAlbumResult.status >= 300) {
    const errorMsg = extractLidarrError(addAlbumResult.data);

    // If Lidarr says "already added", fetch all albums and find it
    if (
      errorMsg.toLowerCase().includes("already") &&
      errorMsg.toLowerCase().includes("added")
    ) {
      const allAlbumsResult = await lidarrGet<LidarrAlbum[]>("/album");
      const existingAlbum = allAlbumsResult.data.find(
        (a) => a.foreignAlbumId === albumMbid
      );

      if (existingAlbum) {
        return existingAlbum;
      }
    }

    throw new Error(`Failed to add album: ${errorMsg}`);
  }

  return addAlbumResult.data;
};

const addArtistToLidarr = async (artistMbid: string) => {
  const qualityProfileId = getConfigValue("lidarrQualityProfileId");
  const metadataProfileId = getConfigValue("lidarrMetadataProfileId");
  const rootFolderPath = getConfigValue("lidarrRootFolderPath");

  const artistLookup = await lidarrGet<LidarrArtist[]>("/artist/lookup", {
    term: `lidarr:${artistMbid}`,
  });

  if (!artistLookup.data?.length) {
    throw new Error("Artist not found in Lidarr lookup");
  }

  const addArtistResult = await lidarrPost<LidarrArtist>("/artist", {
    ...artistLookup.data[0],
    qualityProfileId,
    metadataProfileId,
    rootFolderPath,
    monitored: true,
    monitorNewItems: "none",
    addOptions: { monitor: "existing", monitored: true },
  });

  if (!addArtistResult.ok) {
    throw new Error(
      `Failed to add artist: ${extractLidarrError(addArtistResult.data)}`
    );
  }

  return addArtistResult.data;
};

export const getOrAddArtist = async (artistMbid: string) => {
  const artistsResult = await lidarrGet<LidarrArtist[]>("/artist");
  const artist = artistsResult.data.find(
    (a) => a.foreignArtistId === artistMbid
  );

  if (artist) {
    return artist;
  }

  return await addArtistToLidarr(artistMbid);
};

export const getOrAddAlbum = async (
  albumMbid: string,
  artist: LidarrArtist
) => {
  // Check all albums in Lidarr, not just this artist's albums
  // This prevents "already added" errors when the album exists under a different artist
  const allAlbumsResult = await lidarrGet<LidarrAlbum[]>("/album");
  const existingAlbum = allAlbumsResult.data.find(
    (a) => a.foreignAlbumId === albumMbid
  );

  if (existingAlbum) {
    return { wasAdded: false, album: existingAlbum };
  }

  return { wasAdded: true, album: await addAlbumToLidarr(albumMbid, artist) };
};
