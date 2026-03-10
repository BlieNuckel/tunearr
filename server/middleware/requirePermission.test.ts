import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { AuthUser } from "../auth/types";
import { Permission } from "../../shared/permissions";
import { requirePermission } from "./requirePermission";

function buildApp(
  user?: AuthUser,
  required: Permission | Permission[] = Permission.ADMIN
) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(requirePermission(required));
  app.get("/test", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(
    (
      err: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res.status(err.status || 500).json({ error: err.message });
    }
  );
  return app;
}

const adminUser: AuthUser = {
  id: 1,
  username: "admin",
  userType: "local",
  permissions: Permission.ADMIN,
  enabled: true,
  theme: "system",
  thumb: null,
  hasPlexToken: false,
  plexToken: null,
};

const regularUser: AuthUser = {
  id: 2,
  username: "user",
  userType: "local",
  permissions: Permission.REQUEST,
  enabled: true,
  theme: "system",
  thumb: null,
  hasPlexToken: false,
  plexToken: null,
};

describe("requirePermission middleware", () => {
  it("returns 401 when no user on request", async () => {
    const app = buildApp(undefined);
    const res = await request(app).get("/test");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("returns 403 for user without required permission", async () => {
    const app = buildApp(regularUser, Permission.ADMIN);
    const res = await request(app).get("/test");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Insufficient permissions");
  });

  it("passes through for admin user", async () => {
    const app = buildApp(adminUser);
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("admin bypasses any permission check", async () => {
    const app = buildApp(adminUser, Permission.REQUEST);
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
  });

  it("passes through when user has the required permission", async () => {
    const app = buildApp(regularUser, Permission.REQUEST);
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
  });

  it("supports array of permissions with default or mode", async () => {
    const app = buildApp(regularUser, [
      Permission.REQUEST,
      Permission.MANAGE_USERS,
    ]);
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
  });

  it("returns 403 when user has none of the required permissions", async () => {
    const app = buildApp(regularUser, [
      Permission.MANAGE_USERS,
      Permission.MANAGE_REQUESTS,
    ]);
    const res = await request(app).get("/test");
    expect(res.status).toBe(403);
  });
});
