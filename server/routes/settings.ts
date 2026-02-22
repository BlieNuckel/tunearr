import type { Request, Response } from "express";
import express from "express";
import fs from "fs";
import { getConfig, setConfig } from "../config";
import { lidarrFetch } from "../api/lidarr/fetch";

const router = express.Router();

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
  const url = lidarrUrl.replace(/\/+$/, "");
  const headers = { "X-Api-Key": lidarrApiKey };
  const response = await lidarrFetch(`${url}/api/v1/system/status`, {
    headers,
  });
  if (!response.ok) {
    return res
      .status(response.status)
      .json({ error: `Lidarr returned ${response.status}` });
  }
  const data = await response.json();

  const [qualityRes, metadataRes, rootRes] = await Promise.all([
    lidarrFetch(`${url}/api/v1/qualityprofile`, { headers }).catch(() => null),
    lidarrFetch(`${url}/api/v1/metadataprofile`, { headers }).catch(() => null),
    lidarrFetch(`${url}/api/v1/rootfolder`, { headers }).catch(() => null),
  ]);

  const qualityProfiles = qualityRes?.ok
    ? (await qualityRes.json()).map((p: { id: number; name: string }) => ({
        id: p.id,
        name: p.name,
      }))
    : [];
  const metadataProfiles = metadataRes?.ok
    ? (await metadataRes.json()).map((p: { id: number; name: string }) => ({
        id: p.id,
        name: p.name,
      }))
    : [];
  const rootFolderPaths = rootRes?.ok
    ? (await rootRes.json()).map((f: { id: number; path: string }) => ({
        id: f.id,
        path: f.path,
      }))
    : [];

  res.json({
    success: true,
    version: data.version,
    qualityProfiles,
    metadataProfiles,
    rootFolderPaths,
  });
});

export default router;
