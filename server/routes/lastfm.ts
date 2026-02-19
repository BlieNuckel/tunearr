import type { Request, Response } from "express";
import express from "express";
import { enrichWithImages } from "../deezerApi/artistImages";
import {
  getSimilarArtists,
  getArtistTopTags,
  getTopArtistsByTag,
} from "../lastfmApi/artists";

const router = express.Router();

router.get("/similar", async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (typeof artist !== "string") {
    return res
      .status(400)
      .json({ error: "artist query parameter is required" });
  }

  const artists = await getSimilarArtists(artist);
  await enrichWithImages(artists);
  res.json({ artists });
});

router.get("/artist/tags", async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (typeof artist !== "string") {
    return res
      .status(400)
      .json({ error: "artist query parameter is required" });
  }

  const tags = await getArtistTopTags(artist);
  res.json({ tags });
});

router.get("/tag/artists", async (req: Request, res: Response) => {
  const { tag, page } = req.query;
  if (typeof tag !== "string") {
    return res.status(400).json({ error: "tag query parameter is required" });
  }

  const result = await getTopArtistsByTag(
    tag,
    typeof page === "string" ? page : "1"
  );
  await enrichWithImages(result.artists);
  res.json(result);
});

export default router;
