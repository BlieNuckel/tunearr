import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase } from "./db/index";
import { createLogger } from "./logger";
import authRoutes from "./routes/auth";
import lastfmRoutes from "./routes/lastfm";
import lidarrRoutes from "./routes/lidarr";
import logsRoutes from "./routes/logs";
import musicbrainzRoutes from "./routes/musicbrainz";
import plexRoutes from "./routes/plex";
import promotedAlbumRoutes from "./routes/promotedAlbum";
import sabnzbdRoutes from "./routes/sabnzbd";
import settingsRoutes from "./routes/settings";
import torznabRoutes from "./routes/torznab";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/requireAuth";

const log = createLogger("Server");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/torznab", torznabRoutes);
app.use("/api/sabnzbd", sabnzbdRoutes);
app.use("/api/logs", logsRoutes);

app.use("/api/settings", settingsRoutes);
app.use("/api/musicbrainz", requireAuth, musicbrainzRoutes);
app.use("/api/lidarr", requireAuth, lidarrRoutes);
app.use("/api/lastfm", requireAuth, lastfmRoutes);
app.use("/api/plex", requireAuth, plexRoutes);
app.use("/api/promoted-album", requireAuth, promotedAlbumRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "build")));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "index.html"));
  });
}

app.use(errorHandler);

initializeDatabase();

app.listen(PORT, () => {
  log.info(`Listening on port ${PORT}`);
});
