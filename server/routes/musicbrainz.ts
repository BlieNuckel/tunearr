import type { Request, Response } from "express";
import express from "express";
import rateLimiter from "../middleware/rateLimiter";
import {
  searchReleaseGroups,
  searchArtistReleaseGroups,
} from "../api/musicbrainz/releaseGroups";
import { getReleaseTracks } from "../api/musicbrainz/tracks";
import { getTrackPreviews } from "../api/deezer/tracks";

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

    if (artistName) {
      const allTracks = media.flatMap((m) =>
        m.tracks.map((t: { title: string }) => ({
          artistName,
          title: t.title,
        }))
      );

      const previews = await getTrackPreviews(allTracks);

      for (const medium of media) {
        for (const track of medium.tracks) {
          const key = `${artistName.toLowerCase()}|${track.title.toLowerCase()}`;
          const previewUrl = previews.get(key) || "";
          if (previewUrl) {
            (track as Record<string, unknown>).previewUrl = previewUrl;
          }
        }
      }
    }

    res.json({ media });
  }
);

export default router;
