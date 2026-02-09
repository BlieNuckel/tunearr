const express = require("express");
const { loadConfig, saveConfig } = require("../config");

const router = express.Router();

router.get("/", (_req, res) => {
  const config = loadConfig();
  res.json({
    lidarrUrl: config.lidarrUrl,
    lidarrApiKey: config.lidarrApiKey
      ? "••••" + config.lidarrApiKey.slice(-4)
      : "",
  });
});

router.put("/", (req, res) => {
  const { lidarrUrl, lidarrApiKey } = req.body;
  if (!lidarrUrl || !lidarrApiKey) {
    return res.status(400).json({ error: "URL and API key are required" });
  }
  const url = lidarrUrl.replace(/\/+$/, "");
  saveConfig({ lidarrUrl: url, lidarrApiKey });
  res.json({ success: true });
});

router.post("/test", async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
