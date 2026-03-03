import type { Request, Response, NextFunction } from "express";
import express from "express";
import {
  listAllUsers,
  updateUserRole,
  updateUserEnabled,
  deleteUser,
} from "../auth/users";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

const VALID_ROLES = ["admin", "user"] as const;

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/", (_req: Request, res: Response) => {
  res.json(listAllUsers());
});

router.patch(
  "/:id/role",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.id);
      const { role } = req.body;

      if (!role || !VALID_ROLES.includes(role)) {
        const err = new Error("Role must be 'admin' or 'user'") as Error & {
          status: number;
        };
        err.status = 400;
        throw err;
      }

      updateUserRole(userId, role);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/enabled",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.id);
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        const err = new Error("enabled must be a boolean") as Error & {
          status: number;
        };
        err.status = 400;
        throw err;
      }

      updateUserEnabled(userId, enabled);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);

    if (req.user!.id === userId) {
      const err = new Error("Cannot delete yourself") as Error & {
        status: number;
      };
      err.status = 400;
      throw err;
    }

    deleteUser(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
