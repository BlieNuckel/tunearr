import express, { type Request, type Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requirePermission } from "../middleware/requirePermission";
import { Permission } from "../../shared/permissions";
import { ApiError } from "../middleware/ApiError";
import {
  findEventsForArtist,
  findGoingForUser,
  findJambaseIdForArtistMbid,
  markViewed,
  setUserResponse,
} from "../db/liveEvents";
import type { LiveEventResponse } from "../db/index";
import {
  serializeLiveEvent,
  serializeTour,
} from "../services/liveEvents/serialize";
import { listTouringArtists } from "../services/liveEvents/tours";
import {
  readLivePreferences,
  writeLivePreferences,
} from "../services/liveEvents/preferences";
import type { LivePreferencesPatch } from "../services/liveEvents/preferences";
import { getQuotaStatus } from "../services/liveEvents/quota";
import { searchPlaces } from "../api/openMeteo/geocoding";
import {
  countLiveTracking,
  getArtistLiveTracking,
} from "../services/liveEvents/tracking";

const router = express.Router();

const RESPONSES: LiveEventResponse[] = ["going", "dismissed"];

function parseEventId(raw: string | string[] | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, "Invalid event id");
  }
  return id;
}

router.use(requireAuth);

router.get("/preferences", async (req: Request, res: Response) => {
  res.json(await readLivePreferences(req.user!.id));
});

router.patch("/preferences", async (req: Request, res: Response) => {
  const patch = req.body as LivePreferencesPatch;
  res.json(await writeLivePreferences(req.user!.id, patch));
});

router.get("/quota", async (_req: Request, res: Response) => {
  res.json(await getQuotaStatus());
});

/** Every user sets their own location, so every user can look one up. */
router.get("/geocode", async (req: Request, res: Response) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  res.json({ places: await searchPlaces(query) });
});

/** Instance-wide roster health, so ADMIN rather than per-user. */
router.get(
  "/roster",
  requirePermission(Permission.ADMIN),
  async (_req: Request, res: Response) => {
    res.json(await countLiveTracking());
  }
);

/** One row per touring followed artist, nearest first. */
router.get("/tours", async (req: Request, res: Response) => {
  const { hasLocation, tours } = await listTouringArtists(req.user!.id);
  res.json({ hasLocation, tours: tours.map(serializeTour) });
});

router.get("/going", async (req: Request, res: Response) => {
  const events = await findGoingForUser(
    req.user!.id,
    new Date().toISOString().slice(0, 10)
  );
  res.json({ events: events.map(serializeLiveEvent) });
});

router.get("/artist/:mbid", async (req: Request, res: Response) => {
  const mbid = String(req.params.mbid);
  const [jambaseArtistId, liveTracking] = await Promise.all([
    findJambaseIdForArtistMbid(mbid),
    getArtistLiveTracking(mbid),
  ]);

  // Only artists somebody follows have ever been resolved, so an unfollowed
  // artist has no dates rather than an error. liveTracking says which of those
  // it is, so an empty list can explain itself.
  if (!jambaseArtistId) {
    res.json({ events: [], liveTracking });
    return;
  }

  const events = await findEventsForArtist(req.user!.id, jambaseArtistId, {
    now: new Date().toISOString().slice(0, 10),
    includePast: req.query.includePast === "true",
  });

  res.json({ events: events.map(serializeLiveEvent), liveTracking });
});

router.post("/events/:id/response", async (req: Request, res: Response) => {
  const eventId = parseEventId(req.params.id);
  const { response } = req.body as { response?: LiveEventResponse | null };

  if (response !== null && !RESPONSES.includes(response as LiveEventResponse)) {
    throw new ApiError(400, "response must be 'going', 'dismissed', or null");
  }

  await setUserResponse(
    req.user!.id,
    eventId,
    response ?? null,
    new Date().toISOString()
  );
  res.json({ ok: true });
});

router.post("/events/:id/viewed", async (req: Request, res: Response) => {
  const eventId = parseEventId(req.params.id);
  await markViewed(req.user!.id, eventId, new Date().toISOString());
  res.json({ ok: true });
});

export default router;
