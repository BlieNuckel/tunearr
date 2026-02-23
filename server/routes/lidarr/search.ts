import express, { Request, Response } from "express";
import { lidarrPost } from "../../api/lidarr/post";

const router = express.Router();

router.post("/search", async (req: Request, res: Response) => {
  const { albumIds } = req.body;

  if (!Array.isArray(albumIds) || albumIds.length === 0) {
    return res
      .status(400)
      .json({ error: "albumIds must be a non-empty array" });
  }

  await lidarrPost("/command", {
    name: "AlbumSearch",
    albumIds,
  });

  res.json({ status: "success" });
});

export default router;
