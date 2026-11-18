import type { Request, Response } from "express";
import express from "express";
import { getSimilarArtists } from "../api/lastfm/artists";
import { enrichArtistsWithImages } from "../services/lastfm";

const router = express.Router();

router.get("/similar", async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (typeof artist !== "string") {
    return res
      .status(400)
      .json({ error: "artist query parameter is required" });
  }

  const artists = await getSimilarArtists(artist);
  const enrichedArtists = await enrichArtistsWithImages(artists);

  res.json({ artists: enrichedArtists });
});

export default router;
