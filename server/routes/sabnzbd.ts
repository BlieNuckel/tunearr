import type { Request, Response } from "express";
import type {
  SabnzbdQueueSlot,
  SabnzbdHistorySlot,
  SlskdTransfer,
} from "../api/slskd/types";
import express from "express";
import multer from "multer";
import { decodeNzb } from "../api/slskd/nzb";
import {
  addDownload,
  getDownload,
  getAllDownloads,
  removeDownload,
} from "../api/slskd/downloadTracker";
import {
  enqueueDownload,
  getDownloadTransfers,
  cancelDownload,
} from "../api/slskd/transfer";
import { aggregateStatus, mapTransferState } from "../api/slskd/statusMap";
import { getSlskdConfig } from "../api/slskd/config";
import { createLogger } from "../logger";

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
      categories: [{ name: "music", dir: "music" }],
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

async function handleQueue(req: Request, res: Response): Promise<void> {
  const name = req.query.name as string | undefined;

  if (name === "delete") {
    await handleQueueDelete(req, res);
    return;
  }

  try {
    const transferGroups = await getDownloadTransfers();
    const tracked = getAllDownloads();
    const slots: SabnzbdQueueSlot[] = [];

    for (const dl of tracked) {
      const transfers = findMatchingTransfers(
        dl.username,
        dl.files,
        transferGroups
      );
      const status = aggregateStatus(transfers);

      if (status === "Completed" || status === "Failed") continue;

      const bytesTransferred = transfers.reduce(
        (sum, t) => sum + t.bytesTransferred,
        0
      );
      const remaining = dl.totalSize - bytesTransferred;
      const percentage =
        dl.totalSize > 0
          ? Math.round((bytesTransferred / dl.totalSize) * 100)
          : 0;

      slots.push({
        nzo_id: dl.nzoId,
        filename: dl.title,
        cat: dl.category,
        mb: (dl.totalSize / 1024 / 1024).toFixed(1),
        mbleft: (remaining / 1024 / 1024).toFixed(1),
        percentage: String(percentage),
        status,
        timeleft: estimateTimeLeft(transfers),
      });
    }

    res.json({ queue: { slots, noofslots: slots.length } });
  } catch (err) {
    log.error("Queue poll failed:", err);
    res.json({ queue: { slots: [], noofslots: 0 } });
  }
}

async function handleHistory(req: Request, res: Response): Promise<void> {
  const name = req.query.name as string | undefined;

  if (name === "delete") {
    handleHistoryDelete(req, res);
    return;
  }

  try {
    const transferGroups = await getDownloadTransfers();
    const tracked = getAllDownloads();
    const { downloadPath } = getSlskdConfig();
    const slots: SabnzbdHistorySlot[] = [];

    for (const dl of tracked) {
      const transfers = findMatchingTransfers(
        dl.username,
        dl.files,
        transferGroups
      );
      const status = aggregateStatus(transfers);

      if (status !== "Completed" && status !== "Failed") continue;

      slots.push({
        nzo_id: dl.nzoId,
        name: dl.title,
        category: dl.category,
        bytes: dl.totalSize,
        status,
        completed: Math.floor(Date.now() / 1000),
        storage: `${downloadPath}/${dl.username}`,
      });
    }

    res.json({ history: { slots, noofslots: slots.length } });
  } catch (err) {
    log.error("History poll failed:", err);
    res.json({ history: { slots: [], noofslots: 0 } });
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
    const metadata = decodeNzb(nzbXml);
    const category =
      (req.query.cat as string) || (req.body?.cat as string) || "music";
    const nzoId = `slskd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const title = metadata.files[0]?.filename
      ? extractDirectoryName(metadata.files[0].filename)
      : "Unknown";

    await enqueueDownload(metadata.username, metadata.files);

    addDownload({
      nzoId,
      title,
      category,
      username: metadata.username,
      files: metadata.files,
      totalSize: metadata.files.reduce((sum, f) => sum + f.size, 0),
      addedAt: Date.now(),
    });

    log.info(
      `Queued download: ${title} from ${metadata.username} (${metadata.files.length} files)`
    );
    res.json({ status: true, nzo_ids: [nzoId] });
  } catch (err) {
    log.error("addfile failed:", err);
    res
      .status(400)
      .json({
        status: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
  }
}

async function handleQueueDelete(req: Request, res: Response): Promise<void> {
  const value = req.query.value as string;
  if (!value) {
    res.json({ status: true });
    return;
  }

  const dl = getDownload(value);
  if (dl) {
    try {
      const transferGroups = await getDownloadTransfers();
      const transfers = findMatchingTransfers(
        dl.username,
        dl.files,
        transferGroups
      );
      await Promise.all(
        transfers.map((t) => cancelDownload(dl.username, t.id))
      );
    } catch (err) {
      log.error("Cancel transfers failed:", err);
    }
    removeDownload(value);
  }

  res.json({ status: true });
}

function handleHistoryDelete(req: Request, res: Response): void {
  const value = req.query.value as string;
  if (value) {
    removeDownload(value);
  }
  res.json({ status: true });
}

function findMatchingTransfers(
  username: string,
  files: { filename: string }[],
  transferGroups: {
    username: string;
    directories: { directory: string; files: SlskdTransfer[] }[];
  }[]
): SlskdTransfer[] {
  const filenames = new Set(files.map((f) => f.filename));
  const matches: SlskdTransfer[] = [];

  for (const group of transferGroups) {
    if (group.username !== username) continue;
    for (const dir of group.directories) {
      for (const transfer of dir.files) {
        if (filenames.has(transfer.filename)) {
          matches.push(transfer);
        }
      }
    }
  }

  return matches;
}

function estimateTimeLeft(transfers: SlskdTransfer[]): string {
  const activeTransfers = transfers.filter(
    (t) => mapTransferState(t.state) === "Downloading"
  );
  if (activeTransfers.length === 0) return "00:00:00";

  const totalRemaining = activeTransfers.reduce(
    (sum, t) => sum + (t.size - t.bytesTransferred),
    0
  );
  const totalSpeed = activeTransfers.reduce(
    (sum, t) => sum + t.averageSpeed,
    0
  );

  if (totalSpeed <= 0) return "99:99:99";

  const seconds = Math.ceil(totalRemaining / totalSpeed);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function extractDirectoryName(filename: string): string {
  const lastSlash = Math.max(
    filename.lastIndexOf("\\"),
    filename.lastIndexOf("/")
  );
  if (lastSlash === -1) return filename;
  const dir = filename.slice(0, lastSlash);
  const parentSlash = Math.max(dir.lastIndexOf("\\"), dir.lastIndexOf("/"));
  return parentSlash === -1 ? dir : dir.slice(parentSlash + 1);
}

export default router;
