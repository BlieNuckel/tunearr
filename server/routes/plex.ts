import type { Request, Response } from "express";
import express from "express";
import { getTopArtists } from "../api/plex/topArtists";
import { getPlexConfig } from "../api/plex/config";
import { getPlexServers } from "../api/plex/servers";

const router = express.Router();

router.get("/top-artists", async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const artists = await getTopArtists(limit);
  res.json({ artists });
});

router.get("/thumb", async (req: Request, res: Response) => {
  const path = req.query.path as string;
  if (!path) {
    res.status(400).json({ error: "Missing path parameter" });
    return;
  }

  const { baseUrl, headers } = getPlexConfig();
  const upstream = await fetch(`${baseUrl}${path}`, { headers });

  if (!upstream.ok) {
    res.status(upstream.status).end();
    return;
  }

  const contentType = upstream.headers.get("content-type");
  if (contentType) res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");

  const buffer = await upstream.arrayBuffer();
  res.send(Buffer.from(buffer));
});

router.get("/servers", async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: "Missing token parameter" });
    return;
  }

  const servers = await getPlexServers(token);
  res.json({ servers });
});

export default router;
