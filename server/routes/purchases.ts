import express, { type Request, type Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  recordPurchase,
  removePurchase,
  getPurchases,
  getSpendingSummary,
  readSpendingSettings,
  writeSpendingSettings,
} from "../services/purchases/purchaseService";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const items = await getPurchases(req.user!.id);

  const sanitized = items.map((item) => ({
    id: item.id,
    albumMbid: item.album_mbid,
    artistName: item.artist_name,
    albumTitle: item.album_title,
    price: item.price,
    currency: item.currency,
    purchasedAt: item.purchased_at,
  }));

  res.json(sanitized);
});

router.get("/summary", async (req: Request, res: Response) => {
  const summary = await getSpendingSummary(req.user!.id);
  res.json(summary);
});

router.get("/spending", async (req: Request, res: Response) => {
  res.json(await readSpendingSettings(req.user!.id));
});

router.patch("/spending", async (req: Request, res: Response) => {
  const { currency, monthlyLimit } = req.body ?? {};
  res.json(
    await writeSpendingSettings(req.user!.id, { currency, monthlyLimit })
  );
});

router.post("/", async (req: Request, res: Response) => {
  const { albumMbid, price } = req.body;

  if (!albumMbid) {
    return res.status(400).json({ error: "albumMbid is required" });
  }
  if (typeof price !== "number" || !Number.isInteger(price) || price < 0) {
    return res
      .status(400)
      .json({ error: "price must be a non-negative integer (minor units)" });
  }
  const result = await recordPurchase(req.user!.id, albumMbid, price);
  res.json(result);
});

router.delete("/:albumMbid", async (req: Request, res: Response) => {
  const albumMbid = req.params.albumMbid as string;
  const result = await removePurchase(req.user!.id, albumMbid);

  if (result.status === "not_found") {
    return res.status(404).json({ error: "Purchase not found" });
  }

  res.json(result);
});

export default router;
