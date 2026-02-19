import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../lidarrApi/get.js";
import {
  LidarrPaginatedResponse,
  LidarrHistoryRecord,
} from "../../lidarrApi/types";

const router = express.Router();

router.get("/history", async (req: Request, res: Response) => {
  const query: Record<string, unknown> = {
    page: req.query.page || 1,
    pageSize: req.query.pageSize || 20,
    includeArtist: true,
    includeAlbum: true,
    sortKey: "date",
    sortDirection: "descending",
  };
  if (req.query.eventType) query.eventType = req.query.eventType;
  const result = await lidarrGet<LidarrPaginatedResponse<LidarrHistoryRecord>>(
    "/history",
    query
  );
  res.status(result.status).json(result.data);
});

export default router;
