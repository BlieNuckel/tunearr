import type { Request, Response } from "express";
import express from "express";
import { getLidarrQueue } from "../../services/lidarr/queue";

const router = express.Router();

router.get("/queue", async (req: Request, res: Response) => {
  const page = typeof req.query.page === "string" ? req.query.page : 1;
  const pageSize =
    typeof req.query.pageSize === "string" ? req.query.pageSize : 20;

  const result = await getLidarrQueue(page, pageSize);
  res.status(result.status).json(result.data);
});

export default router;
