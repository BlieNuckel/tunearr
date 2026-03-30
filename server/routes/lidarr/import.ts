import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createLogger } from "../../logger";
import { getConfigValue } from "../../config";
import { requirePermission } from "../../middleware/requirePermission";
import { Permission } from "../../../shared/permissions";
import type { LidarrManualImportItem } from "../../api/lidarr/types";
import {
  ALLOWED_EXTENSIONS,
  scanUploadedFiles,
  confirmImport,
} from "../../services/lidarr/import";

const log = createLogger("Import");

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      __uploadId?: string;
      __uploadDir?: string;
    }
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      const importPath = getConfigValue("importPath");
      if (!importPath) {
        return cb(new Error("importPath not configured"), "");
      }

      const uploadId = _req.__uploadId || crypto.randomUUID();
      const uploadDir = path.join(importPath, uploadId);
      fs.mkdirSync(uploadDir, { recursive: true });

      _req.__uploadId = uploadId;
      _req.__uploadDir = uploadDir;

      cb(null, uploadDir);
    } catch (err) {
      cb(err instanceof Error ? err : new Error("Unknown error"), "");
    }
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${ext} not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const singleFileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      const importPath = getConfigValue("importPath");
      if (!importPath) {
        return cb(new Error("importPath not configured"), "");
      }

      const uploadId =
        _req.body?.uploadId || _req.__uploadId || crypto.randomUUID();
      const uploadDir = path.join(importPath, uploadId);
      fs.mkdirSync(uploadDir, { recursive: true });

      _req.__uploadId = uploadId;
      _req.__uploadDir = uploadDir;

      cb(null, uploadDir);
    } catch (err) {
      cb(err instanceof Error ? err : new Error("Unknown error"), "");
    }
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const singleUpload = multer({
  storage: singleFileStorage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const router = express.Router();
const adminOnly = requirePermission(Permission.ADMIN);

const requireImportPath = (_req: Request, res: Response, next: () => void) => {
  const importPath = getConfigValue("importPath");
  if (!importPath) {
    return res.status(400).json({
      error: "Import path not configured. Please set it in Settings.",
    });
  }
  if (!fs.existsSync(importPath)) {
    return res.status(400).json({
      error: `Import path "${importPath}" does not exist. Make sure the directory is created or the volume is mounted.`,
    });
  }
  next();
};

router.post(
  "/import/upload",
  adminOnly,
  requireImportPath,
  upload.array("files"),
  async (req: Request, res: Response) => {
    const { albumMbid } = req.body;
    if (!albumMbid) {
      return res.status(400).json({ error: "albumMbid is required" });
    }

    const uploadId = req.__uploadId;
    const uploadDir = req.__uploadDir;

    if (!uploadId || !uploadDir) {
      return res.status(500).json({ error: "Upload failed" });
    }

    const result = await scanUploadedFiles(albumMbid, uploadDir);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    for (const item of result.items) {
      log.info("upload scan item", {
        path: item.path,
        name: item.name,
        albumReleaseId: item.albumReleaseId,
        trackCount: item.tracks?.length ?? 0,
        trackIds: item.tracks?.map((t) => t.id) ?? [],
        rejectionCount: item.rejections?.length ?? 0,
        rejections: item.rejections?.map((r) => r.reason) ?? [],
      });
    }

    res.json({
      uploadId,
      artistId: result.artistId,
      albumId: result.albumId,
      items: result.items,
    });
  }
);

router.post(
  "/import/upload-file",
  adminOnly,
  requireImportPath,
  singleUpload.single("file"),
  async (req: Request, res: Response) => {
    const uploadId = req.__uploadId;
    if (!uploadId) {
      return res.status(500).json({ error: "Upload failed" });
    }

    res.json({ uploadId });
  }
);

router.post(
  "/import/scan",
  adminOnly,
  requireImportPath,
  async (req: Request, res: Response) => {
    const { uploadId, albumMbid } = req.body;
    if (!uploadId || !albumMbid) {
      return res
        .status(400)
        .json({ error: "uploadId and albumMbid are required" });
    }

    const importPath = getConfigValue("importPath")!;
    const uploadDir = path.join(importPath, uploadId);

    const resolved = path.resolve(uploadDir);
    if (!resolved.startsWith(path.resolve(importPath))) {
      return res.status(400).json({ error: "Invalid uploadId" });
    }

    if (!fs.existsSync(uploadDir)) {
      return res.status(404).json({ error: "Upload directory not found" });
    }

    const result = await scanUploadedFiles(albumMbid, uploadDir);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    for (const item of result.items) {
      log.info("scan item", {
        path: item.path,
        name: item.name,
        rejectionCount: item.rejections?.length ?? 0,
        rejections: item.rejections?.map((r) => r.reason) ?? [],
      });
    }

    res.json({
      uploadId,
      artistId: result.artistId,
      albumId: result.albumId,
      items: result.items,
    });
  }
);

router.post(
  "/import/confirm",
  adminOnly,
  async (req: Request, res: Response) => {
    const { items }: { items: LidarrManualImportItem[] } = req.body;
    if (!items?.length) {
      return res.status(400).json({ error: "items array is required" });
    }

    const result = await confirmImport(items);

    log.info("confirm command response", {
      ok: result.ok,
      status: result.status,
      data: result.data,
    });

    if (!result.ok) {
      return res.status(502).json({ error: "Lidarr manual import failed" });
    }

    res.json({ status: "success" });
  }
);

router.delete(
  "/import/:uploadId",
  adminOnly,
  async (req: Request<{ uploadId: string }>, res: Response) => {
    const importPath = getConfigValue("importPath");
    if (!importPath) {
      return res.status(400).json({ error: "importPath not configured" });
    }

    const uploadDir = path.join(importPath, req.params.uploadId);

    const resolved = path.resolve(uploadDir);
    if (!resolved.startsWith(path.resolve(importPath))) {
      return res.status(400).json({ error: "Invalid uploadId" });
    }

    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true });
    }

    res.json({ status: "cleaned" });
  }
);

export default router;
