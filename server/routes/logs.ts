import express, { Request, Response } from "express";
import { LogLevel } from "../logs/types";
import { getLogs } from "../logs/getLogs";

const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize as string) || 25)
  );
  const rawLevel = req.query.level as string | string[] | undefined;
  const level = rawLevel
    ? ((Array.isArray(rawLevel) ? rawLevel : [rawLevel]) as LogLevel[])
    : undefined;
  const search = req.query.search as string | undefined;

  try {
    res.json(getLogs(page, pageSize, level, search));
  } catch {
    res.status(500).json({ error: "Failed to read logs" });
  }
});

export default router;
