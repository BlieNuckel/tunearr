import type { Request, Response } from "express";
import express from "express";
import { getPromotedAlbum } from "../promotedAlbum/getPromotedAlbum";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const plexToken = req.user?.plexToken;
  if (!plexToken) {
    res.json(null);
    return;
  }
  const forceRefresh = req.query.refresh === "true";
  const result = await getPromotedAlbum(plexToken, forceRefresh);
  res.json(result);
});

export default router;
