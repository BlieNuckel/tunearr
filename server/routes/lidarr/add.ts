import express, { Request, Response } from "express";
import { lidarrPost } from "../../api/lidarr/post";
import { lidarrPut } from "../../api/lidarr/put";
import { clearPromotedAlbumCache } from "../../promotedAlbum/getPromotedAlbum";
import {
  getAlbumByMbid,
  getOrAddArtist,
  getOrAddAlbum,
  removeAlbum,
} from "./helpers";

const router = express.Router();

router.post("/add", async (req: Request, res: Response) => {
  const { albumMbid } = req.body;
  if (!albumMbid) {
    return res.status(400).json({ error: "albumMbid is required" });
  }

  const lookupAlbum = await getAlbumByMbid(albumMbid);
  const artistMbid = lookupAlbum.artist?.foreignArtistId;

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

  await lidarrPost("/command", {
    name: "AlbumSearch",
    albumIds: [album.id],
  });

  clearPromotedAlbumCache();

  res.json({ status: "success" });
});

router.post("/remove", async (req: Request, res: Response) => {
  const { albumMbid } = req.body;

  if (!albumMbid) {
    return res.status(400).json({ error: "albumMbid is required" });
  }

  const lookupAlbum = await getAlbumByMbid(albumMbid);
  const artistMbid = lookupAlbum.artist?.foreignArtistId;

  if (!artistMbid) {
    return res
      .status(404)
      .json({ error: "Could not determine artist from album lookup" });
  }

  const result = await removeAlbum(albumMbid, artistMbid);

  if (!result.artistInLibrary) {
    return res.json({ status: "artist_not_in_library" });
  }

  if (!result.albumInLibrary) {
    return res.json({ status: "album_not_in_library" });
  }

  if (result.alreadyUnmonitored) {
    return res.json({ status: "already_unmonitored" });
  }

  res.json({ status: "success" });
});

export default router;
