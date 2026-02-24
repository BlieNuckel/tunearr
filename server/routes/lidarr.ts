import express from "express";
import addRouter from "./lidarr/add";
import albumsRouter from "./lidarr/albums";
import artistsRouter from "./lidarr/artists";
import autoSetupRouter from "./lidarr/autoSetup";
import historyRouter from "./lidarr/history";
import importRouter from "./lidarr/import";
import metadaProfilestaRouter from "./lidarr/metadataProfile";
import qualityProfilesRouter from "./lidarr/qualityProfile";
import queueRouter from "./lidarr/queue";
import rootPathRouter from "./lidarr/rootPath";
import searchRouter from "./lidarr/search";
import wantedRouter from "./lidarr/wanted";

const router = express.Router();

router.use(addRouter);
router.use(albumsRouter);
router.use(artistsRouter);
router.use(autoSetupRouter);
router.use(historyRouter);
router.use(importRouter);
router.use(queueRouter);
router.use(searchRouter);
router.use(wantedRouter);
router.use(qualityProfilesRouter);
router.use(rootPathRouter);
router.use(metadaProfilestaRouter);

export default router;
