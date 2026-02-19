import type { Request, Response } from "express";
import express from "express";
import { getTopArtists } from "../plexApi/topArtists";

const router = express.Router();

router.get("/top-artists", async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const artists = await getTopArtists(limit);
  res.json({ artists });
});

export default router;
