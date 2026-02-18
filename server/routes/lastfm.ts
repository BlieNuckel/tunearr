import type { Request, Response } from "express";
import express from "express";
import { getConfigValue } from "../config";
import { enrichWithImages } from "../deezerImages";

const router = express.Router();

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

/** @returns the base URL with api_key and format params */
const buildUrl = (method: string, params: Record<string, string>) => {
  const apiKey = getConfigValue("lastfmApiKey") as string;
  if (!apiKey) throw new Error("Last.fm API key not configured");

  const searchParams = new URLSearchParams({
    method,
    api_key: apiKey,
    format: "json",
    ...params,
  });
  return `${LASTFM_BASE}?${searchParams.toString()}`;
};


router.get("/similar", async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (!artist) {
    return res.status(400).json({ error: "artist query parameter is required" });
  }

  try {
    const url = buildUrl("artist.getSimilar", {
      artist: artist as string,
      limit: "30",
    });
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.message || "Last.fm API error" });
    }

    const artists = (data.similarartists?.artist || []).map(
      (a: Record<string, unknown>) => ({
        name: a.name as string,
        mbid: (a.mbid as string) || "",
        match: parseFloat(a.match as string),
        imageUrl: "",
      }),
    );

    await enrichWithImages(artists);

    res.json({ artists });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.get("/artist/tags", async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (!artist) {
    return res.status(400).json({ error: "artist query parameter is required" });
  }

  try {
    const url = buildUrl("artist.getTopTags", {
      artist: artist as string,
    });
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.message || "Last.fm API error" });
    }

    const tags = (data.toptags?.tag || []).map(
      (t: Record<string, unknown>) => ({
        name: t.name as string,
        count: Number(t.count),
      }),
    );

    res.json({ tags });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.get("/tag/artists", async (req: Request, res: Response) => {
  const { tag, page } = req.query;
  if (!tag) {
    return res.status(400).json({ error: "tag query parameter is required" });
  }

  try {
    const url = buildUrl("tag.getTopArtists", {
      tag: tag as string,
      limit: "30",
      page: (page as string) || "1",
    });
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.message || "Last.fm API error" });
    }

    const topartists = data.topartists;
    const artists = (topartists?.artist || []).map(
      (a: Record<string, unknown>, index: number) => ({
        name: a.name as string,
        mbid: (a.mbid as string) || "",
        imageUrl: "",
        rank: index + 1,
      }),
    );

    await enrichWithImages(artists);

    const attr = topartists?.["@attr"] || {};
    res.json({
      artists,
      pagination: {
        page: Number(attr.page) || 1,
        totalPages: Number(attr.totalPages) || 1,
      },
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
