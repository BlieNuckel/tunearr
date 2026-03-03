import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { AuthUser } from "../auth/types";
import { requireAdmin } from "./requireAdmin";

function buildApp(user?: AuthUser) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(requireAdmin);
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

describe("requireAdmin middleware", () => {
  it("returns 401 when no user on request", async () => {
    const app = buildApp(undefined);
    const res = await request(app).get("/test");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("returns 403 for non-admin user", async () => {
    const app = buildApp({
      id: 2,
      username: "user",
      role: "user",
      enabled: true,
      theme: "system",
      thumb: null,
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Admin access required");
  });

  it("passes through for admin user", async () => {
    const app = buildApp({
      id: 1,
      username: "admin",
      role: "admin",
      enabled: true,
      theme: "system",
      thumb: null,
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
