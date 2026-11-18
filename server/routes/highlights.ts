import express, { type Request, type Response } from "express";
import { ApiError } from "../middleware/ApiError";
import {
  dismissHighlight,
  getHighlights,
  HIGHLIGHT_KINDS,
} from "../services/highlights/highlights";
import type { HighlightKind } from "../services/highlights/types";

const router = express.Router();

function parseKind(raw: unknown): HighlightKind {
  if (!HIGHLIGHT_KINDS.includes(raw as HighlightKind)) {
    throw new ApiError(400, "Invalid highlight kind");
  }
  return raw as HighlightKind;
}

function parseId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, "Invalid highlight id");
  }
  return id;
}

router.get("/", async (req: Request, res: Response) => {
  res.json(await getHighlights(req.user!.id));
});

router.post("/:kind/:id/dismiss", async (req: Request, res: Response) => {
  const kind = parseKind(req.params.kind);
  const id = parseId(req.params.id);
  if (!(await dismissHighlight(req.user!.id, kind, id))) {
    throw new ApiError(404, "Highlight not found");
  }
  res.json({ ok: true });
});

export default router;
