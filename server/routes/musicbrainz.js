const express = require("express");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "MusicRequester/0.1.0 (github.com/music-requester)";

router.get("/search", rateLimiter, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }
  try {
    const url = `${MB_BASE}/release-group/?query=${encodeURIComponent(q)}&type=album&limit=20&fmt=json`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `MusicBrainz returned ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
