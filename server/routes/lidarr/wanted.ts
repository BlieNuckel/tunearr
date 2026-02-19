import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../lidarrApi/get";
import {
  LidarrPaginatedResponse,
  LidarrWantedRecord,
} from "../../lidarrApi/types";

const router = express.Router();

router.get("/wanted/missing", async (req: Request, res: Response) => {
  const result = await lidarrGet<LidarrPaginatedResponse<LidarrWantedRecord>>(
    "/wanted/missing",
    {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      sortKey: "title",
      sortDirection: "ascending",
    }
  );
  res.status(result.status).json(result.data);
});

export default router;
