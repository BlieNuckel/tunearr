import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "./logger";
import lastfmRoutes from "./routes/lastfm";
import lidarrRoutes from "./routes/lidarr";
import musicbrainzRoutes from "./routes/musicbrainz";
import plexRoutes from "./routes/plex";
import promotedAlbumRoutes from "./routes/promotedAlbum";
import sabnzbdRoutes from "./routes/sabnzbd";
import settingsRoutes from "./routes/settings";
import torznabRoutes from "./routes/torznab";
import explorationRoutes from "./routes/exploration";
import { errorHandler } from "./middleware/errorHandler";

const log = createLogger("Server");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use("/api/settings", settingsRoutes);
app.use("/api/musicbrainz", musicbrainzRoutes);
app.use("/api/lidarr", lidarrRoutes);
app.use("/api/lastfm", lastfmRoutes);
app.use("/api/plex", plexRoutes);
app.use("/api/promoted-album", promotedAlbumRoutes);
app.use("/api/torznab", torznabRoutes);
app.use("/api/sabnzbd", sabnzbdRoutes);
app.use("/api/exploration", explorationRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "build")));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "index.html"));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  log.info(`Listening on port ${PORT}`);
});
