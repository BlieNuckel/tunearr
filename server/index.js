const express = require("express");
const path = require("path");
const settingsRoutes = require("./routes/settings");
const musicbrainzRoutes = require("./routes/musicbrainz");
const lidarrRoutes = require("./routes/lidarr");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use("/api/settings", settingsRoutes);
app.use("/api/musicbrainz", musicbrainzRoutes);
app.use("/api/lidarr", lidarrRoutes);

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "build")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
