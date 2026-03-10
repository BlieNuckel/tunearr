import type { Request, Response } from "express";
import express from "express";
import { getTopArtists } from "../api/plex/topArtists";
import { getPlexServers } from "../api/plex/servers";
import { getPlexAccount } from "../api/plex/account";
import { fetchPlexThumbnail } from "../services/plex";

const router = express.Router();

function getUserPlexToken(req: Request): string {
  const token = req.user?.plexToken;
  if (!token) {
    throw Object.assign(new Error("No Plex token — sign in with Plex first"), {
      status: 401,
    });
  }
  return token;
}

router.get("/top-artists", async (req: Request, res: Response) => {
  const plexToken = getUserPlexToken(req);
  const limit = Number(req.query.limit) || 10;
  const artists = await getTopArtists(plexToken, limit);
  res.json({ artists });
});

router.get("/thumb", async (req: Request, res: Response) => {
  const plexToken = getUserPlexToken(req);
  const path = req.query.path as string;
  if (!path) {
    res.status(400).json({ error: "Missing path parameter" });
    return;
  }

  const result = await fetchPlexThumbnail(plexToken, path);
  if (!result.ok) {
    res.status(result.status).end();
    return;
  }

  if (result.contentType) res.setHeader("Content-Type", result.contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(result.buffer);
});

router.get("/servers", async (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.user?.plexToken;
  const clientId = req.query.clientId as string;
  if (!token || !clientId) {
    res.status(400).json({ error: "Missing token or clientId parameter" });
    return;
  }

  const servers = await getPlexServers(token, clientId);
  res.json({ servers });
});

router.get("/account", async (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.user?.plexToken;
  const clientId = req.query.clientId as string;
  if (!token || !clientId) {
    res.status(400).json({ error: "Missing token or clientId parameter" });
    return;
  }

  const account = await getPlexAccount(token, clientId);
  res.json(account);
});

export default router;
