import express, { Request, Response } from "express";
import { lidarrPost } from "../../lidarrApi/post";
import { lidarrPut } from "../../lidarrApi/put";
import { getAlbumByMbid, getOrAddArtist, getOrAddAlbum } from "./helpers";

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

  res.json({ status: "success" });
});

export default router;
