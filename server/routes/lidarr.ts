import express from "express";
import addRouter from "./lidarr/add";
import albumsRouter from "./lidarr/albums";
import artistsRouter from "./lidarr/artists";
import historyRouter from "./lidarr/history";
import importRouter from "./lidarr/import";
import metadaProfilestaRouter from "./lidarr/metadataProfile";
import qualityProfilesRouter from "./lidarr/qualityProfile";
import queueRouter from "./lidarr/queue";
import rootPathRouter from "./lidarr/rootPath";
import wantedRouter from "./lidarr/wanted";

const router = express.Router();

router.use(addRouter);
router.use(albumsRouter);
router.use(artistsRouter);
router.use(historyRouter);
router.use(importRouter);
router.use(queueRouter);
router.use(wantedRouter);
router.use(qualityProfilesRouter);
router.use(rootPathRouter);
router.use(metadaProfilestaRouter);

export default router;
