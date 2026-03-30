import type { Request, Response } from "express";
import express from "express";
import rateLimiter from "../middleware/rateLimiter";
import {
  searchReleaseGroups,
  searchArtistReleaseGroups,
  getReleaseGroupById,
} from "../api/musicbrainz/releaseGroups";
import { getReleaseTracks } from "../api/musicbrainz/tracks";
import { enrichTracksWithPreviews } from "../services/musicbrainz";

const router = express.Router();

router.get("/search", rateLimiter, async (req: Request, res: Response) => {
  const { q, searchType } = req.query;
  if (typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const data =
    searchType === "artist"
      ? await searchArtistReleaseGroups(q)
      : await searchReleaseGroups(q);

  res.json(data);
});

router.get(
  "/tracks/:releaseGroupId",
  rateLimiter,
  async (req: Request, res: Response) => {
    const { releaseGroupId } = req.params;
    const artistName =
      typeof req.query.artistName === "string" ? req.query.artistName : "";
    const media = await getReleaseTracks(releaseGroupId as string);

    const enrichedMedia = artistName
      ? await enrichTracksWithPreviews(media, artistName)
      : media;

    res.json({ media: enrichedMedia });
  }
);

router.get(
  "/release-group/:mbid",
  rateLimiter,
  async (req: Request, res: Response) => {
    const { mbid } = req.params;
    const result = await getReleaseGroupById(mbid as string);

    if (!result) {
      return res.status(404).json({ error: "Release group not found" });
    }

    res.json(result);
  }
);

export default router;
