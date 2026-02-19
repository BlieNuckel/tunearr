import type { Request, Response } from "express";
import express from "express";
import { getConfigValue } from "../config";
import { enrichWithImages } from "../deezerApi/artistImages";

const router = express.Router();

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

type LastfmSimilarArtist = {
  name: string;
  mbid: string;
  match: string;
};

type LastfmTag = {
  name: string;
  count: number;
};

type LastfmTagArtist = {
  name: string;
  mbid: string;
};

type LastfmSimilarResponse = {
  error?: number;
  message?: string;
  similarartists?: { artist: LastfmSimilarArtist[] };
};

type LastfmTopTagsResponse = {
  error?: number;
  message?: string;
  toptags?: { tag: LastfmTag[] };
};

type LastfmTagArtistsResponse = {
  error?: number;
  message?: string;
  topartists?: {
    artist: LastfmTagArtist[];
    "@attr"?: { page: string; totalPages: string };
  };
};

/** @returns the base URL with api_key and format params */
const buildUrl = (method: string, params: Record<string, string>) => {
  const apiKey = getConfigValue("lastfmApiKey");
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
  if (typeof artist !== "string") {
    return res.status(400).json({ error: "artist query parameter is required" });
  }

  const url = buildUrl("artist.getSimilar", {
    artist,
    limit: "30",
  });
  const response = await fetch(url);
  const data: LastfmSimilarResponse = await response.json();

  if (data.error) {
    return res.status(400).json({ error: data.message || "Last.fm API error" });
  }

  const artists = (data.similarartists?.artist || []).map((a) => ({
    name: a.name,
    mbid: a.mbid || "",
    match: parseFloat(a.match),
    imageUrl: "",
  }));

  await enrichWithImages(artists);

  res.json({ artists });
});

router.get("/artist/tags", async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (typeof artist !== "string") {
    return res.status(400).json({ error: "artist query parameter is required" });
  }

  const url = buildUrl("artist.getTopTags", { artist });
  const response = await fetch(url);
  const data: LastfmTopTagsResponse = await response.json();

  if (data.error) {
    return res.status(400).json({ error: data.message || "Last.fm API error" });
  }

  const tags = (data.toptags?.tag || []).map((t) => ({
    name: t.name,
    count: Number(t.count),
  }));

  res.json({ tags });
});

router.get("/tag/artists", async (req: Request, res: Response) => {
  const { tag, page } = req.query;
  if (typeof tag !== "string") {
    return res.status(400).json({ error: "tag query parameter is required" });
  }

  const url = buildUrl("tag.getTopArtists", {
    tag,
    limit: "30",
    page: typeof page === "string" ? page : "1",
  });
  const response = await fetch(url);
  const data: LastfmTagArtistsResponse = await response.json();

  if (data.error) {
    return res.status(400).json({ error: data.message || "Last.fm API error" });
  }

  const topartists = data.topartists;
  const artists = (topartists?.artist || []).map((a, index) => ({
    name: a.name,
    mbid: a.mbid || "",
    imageUrl: "",
    rank: index + 1,
  }));

  await enrichWithImages(artists);

  const attr = topartists?.["@attr"];
  res.json({
    artists,
    pagination: {
      page: Number(attr?.page) || 1,
      totalPages: Number(attr?.totalPages) || 1,
    },
  });
});

export default router;
