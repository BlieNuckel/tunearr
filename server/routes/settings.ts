import type { Request, Response } from "express";
import express from "express";
import fs from "fs";
import { getConfig, setConfig } from "../config";
import { clearPromotedAlbumCache } from "../promotedAlbum/getPromotedAlbum";
import { testLidarrConnection } from "../services/settings";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/", (_req: Request, res: Response) => {
  const fullConfig = getConfig();

  res.json(fullConfig);
});

router.put("/", (req: Request, res: Response) => {
  const partialConfig = req.body;

  if (partialConfig.importPath && !fs.existsSync(partialConfig.importPath)) {
    return res.status(400).json({
      error: `Import path "${partialConfig.importPath}" does not exist. Make sure the directory is created or the volume is mounted.`,
    });
  }

  setConfig(partialConfig);

  if (partialConfig.promotedAlbum) {
    clearPromotedAlbumCache();
  }

  res.json({ success: true });
});

router.post("/validate-import-path", (req: Request, res: Response) => {
  const { importPath } = req.body;

  if (!importPath) {
    return res.json({ valid: true });
  }

  if (!fs.existsSync(importPath)) {
    return res.status(400).json({
      error: `Import path "${importPath}" does not exist. Make sure the directory is created or the volume is mounted.`,
    });
  }

  res.json({ valid: true });
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

export default router;
