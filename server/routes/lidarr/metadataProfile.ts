import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../api/lidarr/get.js";
import { LidarrMetadataProfile } from "../../api/lidarr/types";

const router = express.Router();

router.get("/metadataprofiles", async (_req: Request, res: Response) => {
  const result = await lidarrGet<LidarrMetadataProfile[]>("/metadataprofile");
  res.status(200).json(result.data);
});

export default router;
