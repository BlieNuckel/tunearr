import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../lidarrApi/get.js";

const router = express.Router();

// History
router.get("/history", async (req: Request, res: Response) => {
  try {
    const query: Record<string, unknown> = {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      includeAlbum: true,
      sortKey: "date",
      sortDirection: "descending",
    };
    if (req.query.eventType) query.eventType = req.query.eventType;
    const result = await lidarrGet("/history", query);
    res.status(result.status).json(result.data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
