import type { Request, Response } from "express";
import express from "express";
import { createLogger } from "../logger";
import {
  getSimilarArtists,
  getArtistTopTags,
  getTopArtistsByTag,
} from "../api/lastfm/artists";
import { getTopAlbumsByTag } from "../api/lastfm/albums";
import { getAlbumsArtwork } from "../api/apple/artists";
import { getArtistsImages } from "../api/deezer/artists";

const log = createLogger("Last.fm");

const router = express.Router();

router.get("/similar", async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (typeof artist !== "string") {
    return res
      .status(400)
      .json({ error: "artist query parameter is required" });
  }

  const artists = await getSimilarArtists(artist);
  log.info(`/similar: Got ${artists.length} artists from Last.fm`);

  const imageMap = await getArtistsImages(artists.map((a) => a.name));
  log.info(`/similar: Deezer API returned ${imageMap.size} images`);

  const enrichedArtists = artists.map((a) => ({
    ...a,
    imageUrl: imageMap.get(a.name.toLowerCase()) || a.imageUrl,
  }));

  res.json({ artists: enrichedArtists });
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
  const { tags, page } = req.query;
  if (typeof tags !== "string") {
    return res.status(400).json({ error: "tags query parameter is required" });
  }

  const tagList = decodeURIComponent(tags)
    .split(",")
    .map((t) => t.trim());
  const result = await getTopArtistsByTag(
    tagList,
    typeof page === "string" ? page : "1"
  );

  const imageMap = await getArtistsImages(result.artists.map((a) => a.name));
  const enrichedArtists = result.artists.map((a) => ({
    ...a,
    imageUrl: imageMap.get(a.name.toLowerCase()) || a.imageUrl,
  }));

  res.json({ ...result, artists: enrichedArtists });
});

router.get("/tag/albums", async (req: Request, res: Response) => {
  const { tag, page } = req.query;
  if (typeof tag !== "string") {
    return res.status(400).json({ error: "tag query parameter is required" });
  }

  const result = await getTopAlbumsByTag(
    tag,
    typeof page === "string" ? page : "1"
  );
  log.info(`/tag/albums: Got ${result.albums.length} albums from Last.fm`);

  // Enrich with Apple Music artwork
  const artworkMap = await getAlbumsArtwork(
    result.albums.map((a) => ({ name: a.name, artistName: a.artistName }))
  );
  log.info(`/tag/albums: Apple API returned ${artworkMap.size} artworks`);

  const enrichedAlbums = result.albums.map((a) => {
    const key = `${a.name.toLowerCase()}|${a.artistName.toLowerCase()}`;
    return {
      ...a,
      imageUrl: artworkMap.get(key) || a.imageUrl,
    };
  });

  res.json({ ...result, albums: enrichedAlbums });
});

export default router;
