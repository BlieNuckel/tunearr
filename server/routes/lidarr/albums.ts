import express, { Request, Response } from "express";
import { lidarrGet } from "../../api/lidarr/get";
import type { LidarrAlbum } from "../../api/lidarr/types";

const router = express.Router();

router.get("/albums", async (_req: Request, res: Response) => {
  const result = await lidarrGet<LidarrAlbum[]>("/album");

  if (!result.ok) {
    return res.status(result.status).json({ error: "Failed to fetch albums" });
  }

  res.json(result.data.filter((album) => album.monitored));
});

export default router;
