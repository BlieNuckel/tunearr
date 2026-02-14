import type { Request, Response } from "express";
import express from "express";
import { config } from "../config";

const router = express.Router();

router.get("/", (_req: Request, res: Response) => {
  const lidarrApiKey = config.get().lidarrApiKey;
  const lidarrUrl = config.get().lidarrUrl;

  res.json({
    lidarrUrl,
    lidarrApiKey: lidarrApiKey
      ? "••••" + config.get().lidarrApiKey.slice(-4)
      : "",
  });
});

router.put("/", (req: Request, res: Response) => {
  const { lidarrUrl, lidarrApiKey } = req.body;
  if (!lidarrUrl || !lidarrApiKey) {
    return res.status(400).json({ error: "URL and API key are required" });
  }
  const url = lidarrUrl.replace(/\/+$/, "");
  config.set({ lidarrUrl: url, lidarrApiKey });
  res.json({ success: true });
});

router.post("/test", async (req: Request, res: Response) => {
  const { lidarrUrl, lidarrApiKey } = req.body;
  if (!lidarrUrl || !lidarrApiKey) {
    return res.status(400).json({ error: "URL and API key are required" });
  }
  try {
    const url = lidarrUrl.replace(/\/+$/, "");
    const response = await fetch(`${url}/api/v1/system/status`, {
      headers: { "X-Api-Key": lidarrApiKey },
    });
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Lidarr returned ${response.status}` });
    }
    const data = await response.json();
    res.json({ success: true, version: data.version });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
