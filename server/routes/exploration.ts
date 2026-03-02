import type { Request, Response } from "express";
import express from "express";
import { getSuggestions } from "../exploration/getSuggestions";
import { getAlbumTopTags } from "../api/lastfm/albums";

const router = express.Router();

router.post("/suggestions", async (req: Request, res: Response) => {
  const { artistName, albumName, albumMbid, excludeMbids, accumulatedTags } =
    req.body;

  if (!artistName || !albumName || !albumMbid) {
    return res
      .status(400)
      .json({ error: "artistName, albumName, and albumMbid are required" });
  }

  const result = await getSuggestions(
    artistName,
    albumName,
    Array.isArray(excludeMbids) ? excludeMbids : [],
    Array.isArray(accumulatedTags) ? accumulatedTags : []
  );

  res.json(result);
});

router.get("/album-tags", async (req: Request, res: Response) => {
  const { artist, album } = req.query;

  if (typeof artist !== "string" || typeof album !== "string") {
    return res
      .status(400)
      .json({ error: "artist and album query parameters are required" });
  }

  const tags = await getAlbumTopTags(artist, album);
  res.json({ tags });
});

export default router;
