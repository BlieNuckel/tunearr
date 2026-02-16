import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../lidarrApi/get.js";

const router = express.Router();

router.get("/rootfolders", async (_req: Request, res: Response) => {
  try {
    const result = await lidarrGet("/rootfolder");
    res.status(200).json(result.data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
