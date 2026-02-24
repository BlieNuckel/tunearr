import type { Request, Response } from "express";
import express from "express";
import { getWantedMissing } from "../../services/lidarr/wanted";

const router = express.Router();

router.get("/wanted/missing", async (req: Request, res: Response) => {
  const page = typeof req.query.page === "string" ? req.query.page : 1;
  const pageSize =
    typeof req.query.pageSize === "string" ? req.query.pageSize : 20;

  const result = await getWantedMissing(page, pageSize);
  res.status(result.status).json(result.data);
});

export default router;
