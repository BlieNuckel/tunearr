import type { Request, Response } from "express";
import express from "express";
import multer from "multer";
import { getSlskdConfig } from "../api/slskd/config";
import { errorMessage, logSlskdFailure } from "../api/slskd/errors";
import { removeDownload } from "../api/slskd/downloadTracker";
import { createLogger } from "../logger";
import { getQueueSlots } from "../services/sabnzbd/queue";
import { getHistorySlots } from "../services/sabnzbd/history";
import { processAddFile } from "../services/sabnzbd/addFile";
import { deleteQueueItem } from "../services/sabnzbd/deleteQueue";

const log = createLogger("SABnzbd");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/api", (req: Request, res: Response) => {
  handleApiRequest(req, res);
});

router.post("/api", upload.single("name"), (req: Request, res: Response) => {
  handleApiRequest(req, res);
});

async function handleApiRequest(req: Request, res: Response): Promise<void> {
  const mode = (
    (req.query.mode as string) ||
    (req.body?.mode as string) ||
    ""
  ).toLowerCase();

  switch (mode) {
    case "version":
      res.json({ version: "4.2.3" });
      return;

    case "get_config":
      handleGetConfig(res);
      return;

    case "fullstatus":
      handleFullStatus(res);
      return;

    case "queue":
      await handleQueue(req, res);
      return;

    case "history":
      await handleHistory(req, res);
      return;

    case "addfile":
      await handleAddFile(req, res);
      return;

    default:
      res.json({ status: true });
  }
}

function handleGetConfig(res: Response): void {
  const { downloadPath } = getSlskdConfig();
  res.json({
    config: {
      misc: {
        complete_dir: downloadPath,
      },
      categories: [{ name: "music", dir: "" }],
    },
  });
}

function handleFullStatus(res: Response): void {
  const { downloadPath } = getSlskdConfig();
  res.json({
    status: {
      completedir: downloadPath,
    },
  });
}

/**
 * Answers like SABnzbd does when it fails, so Lidarr marks the download client
 * unavailable and shows the reason, instead of seeing an empty, healthy queue.
 * @param {Response} res
 * @param {string} message
 * @param {unknown} err
 */
function sendSabError(res: Response, message: string, err: unknown): void {
  logSlskdFailure(log, message, err);
  res.json({ status: false, error: errorMessage(err) });
}

async function handleQueue(req: Request, res: Response): Promise<void> {
  const name = req.query.name as string | undefined;

  if (name === "delete") {
    const value = req.query.value as string;
    if (value) {
      await deleteQueueItem(value);
    }
    res.json({ status: true });
    return;
  }

  try {
    const slots = await getQueueSlots();
    res.json({ queue: { slots, noofslots: slots.length } });
  } catch (err) {
    sendSabError(res, "Queue poll failed:", err);
  }
}

async function handleHistory(req: Request, res: Response): Promise<void> {
  const name = req.query.name as string | undefined;

  if (name === "delete") {
    const value = req.query.value as string;
    if (value) {
      removeDownload(value);
    }
    res.json({ status: true });
    return;
  }

  try {
    const slots = await getHistorySlots();
    res.json({ history: { slots, noofslots: slots.length } });
  } catch (err) {
    sendSabError(res, "History poll failed:", err);
  }
}

async function handleAddFile(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ status: false, error: "No NZB file uploaded" });
    return;
  }

  try {
    const nzbXml = file.buffer.toString("utf-8");
    const category =
      (req.query.cat as string) || (req.body?.cat as string) || "music";

    const { nzoId, title } = await processAddFile(nzbXml, category);

    log.info(`Queued download: ${title} (${nzoId})`);
    res.json({ status: true, nzo_ids: [nzoId] });
  } catch (err) {
    logSlskdFailure(log, "addfile failed:", err);
    res.status(400).json({ status: false, error: errorMessage(err) });
  }
}

export default router;
