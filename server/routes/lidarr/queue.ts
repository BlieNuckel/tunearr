import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../lidarrApi/get";

const router = express.Router();

// Queue
router.get("/queue", async (req: Request, res: Response) => {
  try {
    const result = await lidarrGet("/queue", {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      includeAlbum: true,
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
