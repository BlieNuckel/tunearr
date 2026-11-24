import type { Request, Response } from "express";
import express from "express";
import { getTopArtists } from "../api/plex/topArtists";
import { fetchPlexThumbnail } from "../services/plex";
import type { TopArtistsRange } from "../api/plex/types";
import {
  connectPlex,
  disconnectPlex,
  getPlexConnectionStatus,
  selectPlexServer,
} from "../services/plexConnection";
import { requirePermission } from "../middleware/requirePermission";
import { ApiError } from "../middleware/ApiError";
import { Permission } from "../../shared/permissions";

const VALID_RANGES = new Set<TopArtistsRange>([
  "all",
  "4weeks",
  "6months",
  "12months",
]);

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
  const rangeParam = req.query.range as string | undefined;
  const range: TopArtistsRange =
    rangeParam && VALID_RANGES.has(rangeParam as TopArtistsRange)
      ? (rangeParam as TopArtistsRange)
      : "all";
  const artists = await getTopArtists(plexToken, limit, range);
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

function requireString(value: unknown, name: string): string {
  if (!value || typeof value !== "string") {
    throw new ApiError(400, `${name} is required`);
  }
  return value;
}

router.get(
  "/connection",
  requirePermission(Permission.ADMIN),
  async (_req: Request, res: Response) => {
    res.json(await getPlexConnectionStatus());
  }
);

router.post(
  "/connection",
  requirePermission(Permission.ADMIN),
  async (req: Request, res: Response) => {
    const authToken = requireString(req.body?.authToken, "authToken");
    res.json(await connectPlex(authToken));
  }
);

router.put(
  "/connection/server",
  requirePermission(Permission.ADMIN),
  async (req: Request, res: Response) => {
    const serverUrl = requireString(req.body?.serverUrl, "serverUrl");
    res.json(await selectPlexServer(serverUrl));
  }
);

router.delete(
  "/connection",
  requirePermission(Permission.ADMIN),
  (_req: Request, res: Response) => {
    disconnectPlex();
    res.json({ success: true });
  }
);

export default router;
