import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../api/lidarr/get.js";
import { LidarrQualityProfile } from "../../api/lidarr/types";

const router = express.Router();

router.get("/qualityprofiles", async (_req: Request, res: Response) => {
  const result = await lidarrGet<LidarrQualityProfile[]>("/qualityprofile");
  res.status(200).json(result.data);
});

export default router;
