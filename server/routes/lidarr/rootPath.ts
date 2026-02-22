import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../api/lidarr/get.js";
import { LidarrRootFolder } from "../../api/lidarr/types";

const router = express.Router();

router.get("/rootfolders", async (_req: Request, res: Response) => {
  const result = await lidarrGet<LidarrRootFolder[]>("/rootfolder");
  res.status(200).json(result.data);
});

export default router;
