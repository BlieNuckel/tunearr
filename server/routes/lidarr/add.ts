import express, { Request, Response } from "express";
import { lidarrGet } from "../../lidarrApi/get";
import { lidarrPost } from "../../lidarrApi/post";
import { lidarrPut } from "../../lidarrApi/put";

const router = express.Router();

type LidarrAlbum = {
  id: number;
  title: string;
  foreignAlbumId: string;
  monitored: boolean;
  artist: {
    id: number;
    name: string;
    foreignArtistId: string;
  };
};

type LidarrArtist = {
  id: number;
  name: string;
  foreignArtistId: string;
  monitored: boolean;
  folder: string;
};

const getAlbumByMbid = async (albumMbid: string) => {
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

  // Add the album with monitored: true
  const addAlbumResult = await lidarrPost<LidarrAlbum>("/album", {
    ...album,
    artist,
    monitored: true,
    addOptions: { searchForNewAlbum: true },
  });

  if (addAlbumResult.status >= 300) {
    const errorData = addAlbumResult.data as unknown;
    const errorArray = Array.isArray(errorData) ? errorData : [];
    const dataRecord = addAlbumResult.data as Record<string, unknown>;
    const errorMessage =
      (errorArray[0] as Record<string, unknown>)?.errorMessage ||
      dataRecord?.message ||
      JSON.stringify(addAlbumResult.data);

    throw new Error(`Failed to add album: ${errorMessage}`);
  }

  return addAlbumResult.data;
};

const addArtistToLidarr = async (artistMbid: string) => {
  const qualityProfileId = 2;
  const metadataProfileId = 2;
  const rootFolderPath = "/data/music";

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
    const errorData = addArtistResult.data as unknown;
    const errorArray = Array.isArray(errorData) ? errorData : [];
    const dataRecord = addArtistResult.data as Record<string, unknown>;
    const errorMessage =
      (errorArray[0] as Record<string, unknown>)?.errorMessage ||
      dataRecord?.message ||
      JSON.stringify(addArtistResult.data);

    throw new Error(`Failed to add artist: ${errorMessage}`);
  }

  return addArtistResult.data;
};

const getOrAddArtist = async (artistMbid: string) => {
  const artistsResult = await lidarrGet<LidarrArtist[]>("/artist");
  const artist = artistsResult.data.find(
    (a) => a.foreignArtistId === artistMbid,
  );

  if (artist) {
    return artist;
  }

  return await addArtistToLidarr(artistMbid);
};

const getOrAddAlbum = async (albumMbid: string, artist: LidarrArtist) => {
  const albumsResult = await lidarrGet<LidarrAlbum[]>("/album", {
    artistId: artist.id,
  });
  let album = albumsResult.data.find((a) => a.foreignAlbumId === albumMbid);

  if (album) {
    return { wasAdded: false, album };
  }

  return { wasAdded: true, album: await addAlbumToLidarr(albumMbid, artist) };
};

router.post("/add", async (req: Request, res: Response) => {
  const { albumMbid } = req.body;
  if (!albumMbid) {
    return res.status(400).json({ error: "albumMbid is required" });
  }

  try {
    const lookupAlbum = await getAlbumByMbid(albumMbid);

    const artistMbid = lookupAlbum.artist?.foreignArtistId as string;

    if (!artistMbid) {
      return res
        .status(404)
        .json({ error: "Could not determine artist from album lookup" });
    }

    const artist = await getOrAddArtist(artistMbid);
    const { wasAdded, album } = await getOrAddAlbum(albumMbid, artist);

    if (!wasAdded && album?.monitored) {
      return res.json({ status: "already_monitored" });
    }

    if (!album.monitored) {
      const monitorResult = await lidarrPut("/album/monitor", {
        albumIds: [album.id],
        monitored: true,
      });

      if (!monitorResult.ok) {
        throw new Error("Failed to monitor album");
      }
    }

    // 5. Trigger album search
    await lidarrPost("/command", {
      name: "AlbumSearch",
      albumIds: [album.id],
    });

    res.json({ status: "success" });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
