import type { Request, Response } from "express";
import express from "express";
import { getPromotedArtists } from "../promotedArtists/getPromotedArtists";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.json(null);
    return;
  }
  const forceRefresh = req.query.refresh === "true";
  const result = await getPromotedArtists(userId, forceRefresh);
  res.json(result);
});

export default router;
