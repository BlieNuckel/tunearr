import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { initializeDatabase, closeDatabase } from "../db";
import authRouter from "./auth";
import { errorHandler } from "../middleware/errorHandler";

let app: express.Express;

beforeEach(() => {
  initializeDatabase(":memory:");
  app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use(errorHandler);
});

afterEach(() => {
  closeDatabase();
});

describe("GET /auth/setup-status", () => {
  it("returns needsSetup: true when no admin exists", async () => {
    const res = await request(app).get("/auth/setup-status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ needsSetup: true });
  });

  it("returns needsSetup: false after admin is created", async () => {
    await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    const res = await request(app).get("/auth/setup-status");
    expect(res.body).toEqual({ needsSetup: false });
  });
});

describe("POST /auth/setup", () => {
  it("creates an admin user and sets a session cookie", async () => {
    const res = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("admin");
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.theme).toBe("system");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("tunearr_session=");
  });

  it("returns 400 if setup already completed", async () => {
    await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    const res = await request(app)
      .post("/auth/setup")
      .send({ username: "admin2", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Setup already completed");
  });

  it("validates username length", async () => {
    const res = await request(app)
      .post("/auth/setup")
      .send({ username: "ab", password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Username");
  });

  it("validates password length", async () => {
    const res = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Password");
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });
  });

  it("returns user and sets cookie on valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("admin");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("returns 401 on wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "admin", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid username or password");
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/logout", () => {
  it("clears the session cookie", async () => {
    const setupRes = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    const cookie = setupRes.headers["set-cookie"][0];

    const res = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const setCookieHeader = res.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];
    expect(cookies.some((c: string) => c.includes("tunearr_session="))).toBe(
      true
    );
  });

  it("succeeds even without a cookie", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(200);
  });
});

describe("GET /auth/me", () => {
  it("returns user: null without a cookie", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it("returns user when authenticated", async () => {
    const setupRes = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    const cookie = setupRes.headers["set-cookie"][0];

    const res = await request(app).get("/auth/me").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("admin");
    expect(res.body.user.theme).toBe("system");
  });

  it("returns user: null for invalid cookie", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Cookie", "tunearr_session=invalidtoken");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });
});

describe("PATCH /auth/preferences", () => {
  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .patch("/auth/preferences")
      .send({ theme: "dark" });
    expect(res.status).toBe(401);
  });

  it("updates theme preference for authenticated user", async () => {
    const setupRes = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    const cookie = setupRes.headers["set-cookie"][0];

    const res = await request(app)
      .patch("/auth/preferences")
      .set("Cookie", cookie)
      .send({ theme: "dark" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const meRes = await request(app).get("/auth/me").set("Cookie", cookie);
    expect(meRes.body.user.theme).toBe("dark");
  });

  it("returns 400 for invalid theme", async () => {
    const setupRes = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    const cookie = setupRes.headers["set-cookie"][0];

    const res = await request(app)
      .patch("/auth/preferences")
      .set("Cookie", cookie)
      .send({ theme: "invalid" });

    expect(res.status).toBe(400);
  });
});
