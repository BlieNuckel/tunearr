import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getConfigValue } from "../../config";
import { lidarrGet } from "../../lidarrApi/get";
import { lidarrPost } from "../../lidarrApi/post";
import { LidarrManualImportItem } from "../../lidarrApi/types";
import { getAlbumByMbid, getOrAddArtist, getOrAddAlbum } from "./helpers";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      __uploadId?: string;
      __uploadDir?: string;
    }
  }
}

const ALLOWED_EXTENSIONS = [".flac", ".mp3", ".ogg", ".wav", ".m4a", ".aac"];

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

const router = express.Router();

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

/** Upload files, ensure artist+album exist in Lidarr, scan with manual import */
router.post(
  "/import/upload",
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

    const lookupAlbum = await getAlbumByMbid(albumMbid);
    const artistMbid = lookupAlbum.artist?.foreignArtistId;
    if (!artistMbid) {
      return res
        .status(404)
        .json({ error: "Could not determine artist from album lookup" });
    }

    const artist = await getOrAddArtist(artistMbid);
    const { album } = await getOrAddAlbum(albumMbid, artist);

    const scanResult = await lidarrGet<LidarrManualImportItem[]>(
      "/manualimport",
      {
        folder: uploadDir,
        artistId: artist.id,
        filterExistingFiles: true,
      }
    );

    if (!scanResult.ok) {
      return res
        .status(502)
        .json({ error: "Lidarr manual import scan failed" });
    }

    if (!scanResult.data?.length) {
      return res.status(400).json({
        error:
          "Lidarr found no importable files. Make sure the import path is accessible to Lidarr.",
      });
    }

    for (const item of scanResult.data) {
      console.log("[import/upload] scan item:", {
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
      artistId: artist.id,
      albumId: album.id,
      items: scanResult.data,
    });
  }
);

/** Confirm manual import — trigger the actual import via Lidarr's command API */
router.post("/import/confirm", async (req: Request, res: Response) => {
  const { items }: { items: LidarrManualImportItem[] } = req.body;
  if (!items?.length) {
    return res.status(400).json({ error: "items array is required" });
  }

  const files = items.map((item) => ({
    path: item.path,
    artistId: item.artist?.id,
    albumId: item.album?.id,
    albumReleaseId: item.albumReleaseId,
    trackIds: Array.isArray(item.tracks) ? item.tracks.map((t) => t.id) : [],
    quality: item.quality,
    indexerFlags: item.indexerFlags ?? 0,
    downloadId: item.downloadId ?? "",
    disableReleaseSwitching: item.disableReleaseSwitching ?? false,
  }));

  console.log(
    "[import/confirm] command payload:",
    JSON.stringify({ files }, null, 2)
  );

  const result = await lidarrPost("/command", {
    name: "ManualImport",
    files,
    importMode: "move",
  });

  console.log("[import/confirm] command response:", {
    ok: result.ok,
    status: result.status,
    data: result.data,
  });

  if (!result.ok) {
    return res.status(502).json({ error: "Lidarr manual import failed" });
  }

  res.json({ status: "success" });
});

/** Cancel upload — clean up temp files */
router.delete(
  "/import/:uploadId",
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
