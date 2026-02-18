import express, { Request, Response } from "express";
import { lidarrGet } from "../../lidarrApi/get";

const router = express.Router();

type LidarrArtist = {
  id: number;
  artistName: string;
  foreignArtistId: string;
};

router.get("/artists", async (_req: Request, res: Response) => {
  try {
    const result = await lidarrGet<LidarrArtist[]>("/artist");

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch artists from Lidarr" });
    }

    const artists = result.data.map((a) => ({
      id: a.id,
      name: a.artistName,
      foreignArtistId: a.foreignArtistId,
    }));

    res.json(artists);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
