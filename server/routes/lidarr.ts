import express from "express";
import addRouter from "./lidarr/add";
import historyRouter from "./lidarr/history";
import queueRouter from "./lidarr/queue";
import wantedRouter from "./lidarr/wanted";

const router = express.Router();

router.use(addRouter);
router.use(historyRouter);
router.use(queueRouter);
router.use(wantedRouter);

export default router;
