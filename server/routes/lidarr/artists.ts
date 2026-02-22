import express, { Request, Response } from "express";
import { lidarrGet } from "../../api/lidarr/get";
import { LidarrArtist } from "../../api/lidarr/types";

const router = express.Router();

router.get("/artists", async (_req: Request, res: Response) => {
  const result = await lidarrGet<LidarrArtist[]>("/artist");

  if (!result.ok) {
    return res
      .status(result.status)
      .json({ error: "Failed to fetch artists from Lidarr" });
  }

  const artists = result.data.map((a) => ({
    id: a.id,
    name: a.artistName,
    foreignArtistId: a.foreignArtistId,
  }));

  res.json(artists);
});

export default router;
