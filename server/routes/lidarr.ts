import express from "express";
import addRouter from "./lidarr/add";
import artistsRouter from "./lidarr/artists";
import historyRouter from "./lidarr/history";
import metadaProfilestaRouter from "./lidarr/metadataProfile";
import qualityProfilesRouter from "./lidarr/qualityProfile";
import queueRouter from "./lidarr/queue";
import rootPathRouter from "./lidarr/rootPath";
import wantedRouter from "./lidarr/wanted";

const router = express.Router();

router.use(addRouter);
router.use(artistsRouter);
router.use(historyRouter);
router.use(queueRouter);
router.use(wantedRouter);
router.use(qualityProfilesRouter);
router.use(rootPathRouter);
router.use(metadaProfilestaRouter);

export default router;
