import type { Request, Response } from "express";
import express from "express";
import {
  getAllUsers,
  createLocalUser,
  updateUserPermissions,
  toggleUserEnabled,
  deleteUser,
} from "../auth/users";
import { deleteUserSessions } from "../auth/sessions";
import { requireAuth } from "../middleware/requireAuth";
import { requirePermission } from "../middleware/requirePermission";
import { Permission } from "../../shared/permissions";

const router = express.Router();

router.use(requireAuth, requirePermission(Permission.MANAGE_USERS));

router.get("/", async (_req: Request, res: Response) => {
  const users = await getAllUsers();
  res.json(users);
});

router.post("/", async (req: Request, res: Response) => {
  const { username, password, permissions } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (typeof username !== "string" || username.trim().length < 1) {
    return res.status(400).json({ error: "Username must be a non-empty string" });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const user = await createLocalUser(
    username.trim(),
    password,
    typeof permissions === "number" ? permissions : Permission.REQUEST
  );
  res.status(201).json(user);
});

router.patch("/:id/permissions", async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);
  const { permissions } = req.body;

  if (typeof permissions !== "number") {
    return res.status(400).json({ error: "Permissions must be a number" });
  }

  const user = await updateUserPermissions(userId, permissions);
  res.json(user);
});

router.patch("/:id/toggle-enabled", async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);

  if (req.user && req.user.id === userId) {
    return res.status(400).json({ error: "Cannot disable your own account" });
  }

  const user = await toggleUserEnabled(userId);
  if (!user.enabled) {
    await deleteUserSessions(userId);
  }
  res.json(user);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id as string, 10);

  if (req.user && req.user.id === userId) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  await deleteUserSessions(userId);
  await deleteUser(userId);
  res.status(204).end();
});

export default router;
