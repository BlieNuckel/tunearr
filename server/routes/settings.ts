import type { Request, Response } from "express";
import express from "express";
import { getConfig, setConfig } from "../config";
import {
  listDirectorySuggestions,
  validateWritableDirectory,
} from "../services/pathValidation";
import {
  onLiveEventsSettingsSaved,
  snapshotLiveEventsSettings,
} from "../services/liveEvents/settingsChange";
import { testLidarrConnection } from "../services/settings";
import { testSlskdConnection } from "../api/slskd/testConnection";
import { testMbConnection } from "../api/musicbrainz/testConnection";
import {
  DEFAULT_MUSICBRAINZ,
  mbRequestsPerSecondError,
  mbServerUrlError,
} from "../../shared/musicbrainzServer";
import { requireAuth } from "../middleware/requireAuth";
import { requirePermission } from "../middleware/requirePermission";
import { Permission } from "../../shared/permissions";

const router = express.Router();

/**
 * Written only by the roster sweep. The settings form sends back the whole
 * `liveEvents` object it loaded, so without this a save would roll the sweep
 * back to whatever state the page was opened with.
 */
const LIVE_SWEEP_STATE_KEYS = [
  "rosterWatermark",
  "rosterFullSweptAt",
  "rosterFullPass",
] as const;

/**
 * The Plex connection holds account tokens and is written only through `/api/plex/connection`,
 * so it is neither sent to the settings form nor accepted back from it.
 */
function withoutPlexConnection<T extends { plexConnection?: unknown }>(
  body: T
): Omit<T, "plexConnection"> {
  const { plexConnection: _plexConnection, ...rest } = body;
  return rest;
}

function withoutLiveSweepState<T extends { liveEvents?: object }>(body: T): T {
  if (!body.liveEvents) return body;
  const liveEvents: Record<string, unknown> = { ...body.liveEvents };
  for (const key of LIVE_SWEEP_STATE_KEYS) delete liveEvents[key];
  return { ...body, liveEvents };
}

router.get("/status", requireAuth, (_req: Request, res: Response) => {
  const config = getConfig();
  res.json({ configured: Boolean(config.lidarrUrl && config.lidarrApiKey) });
});

router.use(requireAuth, requirePermission(Permission.ADMIN));

router.get("/", (_req: Request, res: Response) => {
  res.json(withoutPlexConnection(getConfig()));
});

router.put("/", (req: Request, res: Response) => {
  const partialConfig = withoutPlexConnection(
    withoutLiveSweepState(req.body ?? {})
  );

  if (partialConfig.importPath) {
    const result = validateWritableDirectory(partialConfig.importPath);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }
  }

  const liveEventsBefore = partialConfig.liveEvents
    ? snapshotLiveEventsSettings()
    : null;

  setConfig(partialConfig);

  if (liveEventsBefore) {
    onLiveEventsSettingsSaved(liveEventsBefore);
  }

  res.json({ success: true });
});

router.post("/validate-path", (req: Request, res: Response) => {
  const { path: dirPath } = req.body;

  if (!dirPath) {
    return res.json({ valid: true });
  }

  const result = validateWritableDirectory(dirPath);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ valid: true });
});

router.get("/browse", (req: Request, res: Response) => {
  const dirPath = typeof req.query.path === "string" ? req.query.path : "";
  res.json({ suggestions: listDirectorySuggestions(dirPath) });
});

router.post("/test", async (req: Request, res: Response) => {
  const { lidarrUrl, lidarrApiKey } = req.body;
  if (!lidarrUrl || !lidarrApiKey) {
    return res.status(400).json({ error: "URL and API key are required" });
  }

  const result = await testLidarrConnection(lidarrUrl, lidarrApiKey);
  if ("error" in result) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json(result);
});

router.post("/test-slskd", async (req: Request, res: Response) => {
  const { slskdUrl, slskdApiKey } = req.body;
  if (!slskdUrl || !slskdApiKey) {
    return res.status(400).json({ error: "URL and API key are required" });
  }

  const result = await testSlskdConnection(slskdUrl, slskdApiKey);
  if ("error" in result) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json(result);
});

router.post("/test-musicbrainz", async (req: Request, res: Response) => {
  const serverUrl =
    typeof req.body?.serverUrl === "string" ? req.body.serverUrl : "";
  const requestsPerSecond =
    req.body?.requestsPerSecond ?? DEFAULT_MUSICBRAINZ.requestsPerSecond;

  const error =
    mbServerUrlError(serverUrl) ?? mbRequestsPerSecondError(requestsPerSecond);
  if (error) return res.status(400).json({ error });

  const result = await testMbConnection({ serverUrl, requestsPerSecond });
  if ("error" in result) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json(result);
});

export default router;
