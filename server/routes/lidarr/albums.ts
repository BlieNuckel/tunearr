import express, { Request, Response } from "express";
import { lidarrGet } from "../../lidarrApi/get";
import type { LidarrAlbum } from "../../lidarrApi/types";

const router = express.Router();

router.get("/albums", async (_req: Request, res: Response) => {
  const result = await lidarrGet<LidarrAlbum[]>("/album");

  if (!result.ok) {
    return res.status(result.status).json({ error: "Failed to fetch albums" });
  }

  res.json(result.data);
});

export default router;
