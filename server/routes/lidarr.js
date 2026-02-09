const express = require("express");
const { loadConfig } = require("../config");

const router = express.Router();

/** @returns {{ url: string, headers: Record<string, string> }} */
function getLidarrConfig() {
  const config = loadConfig();
  if (!config.lidarrUrl || !config.lidarrApiKey) {
    throw new Error("Lidarr not configured");
  }
  return {
    url: config.lidarrUrl,
    headers: {
      "X-Api-Key": config.lidarrApiKey,
      "Content-Type": "application/json",
    },
  };
}

/** Generic proxy helper for GET requests */
async function proxyGet(lidarrPath, query = {}) {
  const { url, headers } = getLidarrConfig();
  const params = new URLSearchParams(query).toString();
  const sep = params ? "?" : "";
  const response = await fetch(`${url}/api/v1${lidarrPath}${sep}${params}`, {
    headers,
  });
  return { status: response.status, data: await response.json() };
}

/** Generic proxy helper for POST requests */
async function proxyPost(lidarrPath, body) {
  const { url, headers } = getLidarrConfig();
  const response = await fetch(`${url}/api/v1${lidarrPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

/** Generic proxy helper for PUT requests */
async function proxyPut(lidarrPath, body) {
  const { url, headers } = getLidarrConfig();
  const response = await fetch(`${url}/api/v1${lidarrPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

// Artist endpoints
router.get("/artist", async (_req, res) => {
  try {
    const result = await proxyGet("/artist");
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/artist/lookup", async (req, res) => {
  try {
    const result = await proxyGet("/artist/lookup", {
      term: req.query.term,
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/artist", async (req, res) => {
  try {
    const result = await proxyPost("/artist", req.body);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Album endpoints
router.get("/album", async (req, res) => {
  try {
    const query = {};
    if (req.query.artistId) query.artistId = req.query.artistId;
    const result = await proxyGet("/album", query);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/album/monitor", async (req, res) => {
  try {
    const result = await proxyPut("/album/monitor", req.body);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Queue
router.get("/queue", async (req, res) => {
  try {
    const result = await proxyGet("/queue", {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      includeAlbum: true,
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wanted/missing
router.get("/wanted/missing", async (req, res) => {
  try {
    const result = await proxyGet("/wanted/missing", {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      sortKey: "title",
      sortDirection: "ascending",
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// History
router.get("/history", async (req, res) => {
  try {
    const query = {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      includeAlbum: true,
      sortKey: "date",
      sortDirection: "descending",
    };
    if (req.query.eventType) query.eventType = req.query.eventType;
    const result = await proxyGet("/history", query);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Command (trigger search)
router.post("/command", async (req, res) => {
  try {
    const result = await proxyPost("/command", req.body);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root folder
router.get("/rootfolder", async (_req, res) => {
  try {
    const result = await proxyGet("/rootfolder");
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quality profiles
router.get("/qualityprofile", async (_req, res) => {
  try {
    const result = await proxyGet("/qualityprofile");
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Metadata profiles
router.get("/metadataprofile", async (_req, res) => {
  try {
    const result = await proxyGet("/metadataprofile");
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
