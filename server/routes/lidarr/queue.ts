import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../lidarrApi/get";
import { LidarrPaginatedResponse, LidarrQueueItem } from "../../lidarrApi/types";

const router = express.Router();

router.get("/queue", async (req: Request, res: Response) => {
  const result = await lidarrGet<LidarrPaginatedResponse<LidarrQueueItem>>("/queue", {
    page: req.query.page || 1,
    pageSize: req.query.pageSize || 20,
    includeArtist: true,
    includeAlbum: true,
  });
  res.status(result.status).json(result.data);
});

export default router;
