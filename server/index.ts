import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import lidarrRoutes from "./routes/lidarr";
import musicbrainzRoutes from "./routes/musicbrainz";
import settingsRoutes from "./routes/settings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use("/api/settings", settingsRoutes);
app.use("/api/musicbrainz", musicbrainzRoutes);
app.use("/api/lidarr", lidarrRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "build")));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
