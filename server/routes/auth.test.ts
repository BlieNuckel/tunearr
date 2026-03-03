import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { initializeDatabase, getDb, closeDatabase } from "../db";
import authRouter from "./auth";
import { errorHandler } from "../middleware/errorHandler";

vi.mock("../api/plex/account", () => ({
  getPlexAccountFull: vi.fn(),
}));

vi.mock("../config", () => ({
  getConfigValue: vi.fn(),
}));

import { getPlexAccountFull } from "../api/plex/account";
import { getConfigValue } from "../config";

let app: express.Express;

beforeEach(() => {
  initializeDatabase(":memory:");
  app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use(errorHandler);
  vi.clearAllMocks();
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
    expect(res.body.user.thumb).toBeNull();
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

describe("POST /auth/plex-setup", () => {
  it("creates an admin user via Plex and sets a session cookie", async () => {
    vi.mocked(getPlexAccountFull).mockResolvedValue({
      id: 12345,
      username: "plexadmin",
      email: "admin@plex.tv",
      thumb: "https://plex.tv/thumb.jpg",
    });

    const res = await request(app)
      .post("/auth/plex-setup")
      .send({ authToken: "valid-plex-token" });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("plexadmin");
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.thumb).toBe("https://plex.tv/thumb.jpg");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("tunearr_session=");
  });

  it("returns 400 if setup already completed", async () => {
    await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });

    vi.mocked(getPlexAccountFull).mockResolvedValue({
      id: 12345,
      username: "plexadmin",
      email: "admin@plex.tv",
      thumb: "https://plex.tv/thumb.jpg",
    });

    const res = await request(app)
      .post("/auth/plex-setup")
      .send({ authToken: "valid-plex-token" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Setup already completed");
  });

  it("returns 400 when authToken is missing", async () => {
    const res = await request(app).post("/auth/plex-setup").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("authToken is required");
  });

  it("returns error when Plex token is invalid", async () => {
    vi.mocked(getPlexAccountFull).mockRejectedValue(
      new Error("Plex returned 401")
    );

    const res = await request(app)
      .post("/auth/plex-setup")
      .send({ authToken: "bad-token" });

    expect(res.status).toBe(500);
  });

  it("marks setup as complete after Plex setup", async () => {
    vi.mocked(getPlexAccountFull).mockResolvedValue({
      id: 12345,
      username: "plexadmin",
      email: "admin@plex.tv",
      thumb: "https://plex.tv/thumb.jpg",
    });

    await request(app)
      .post("/auth/plex-setup")
      .send({ authToken: "valid-plex-token" });

    const res = await request(app).get("/auth/setup-status");
    expect(res.body).toEqual({ needsSetup: false });
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

describe("POST /auth/plex-login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });
  });

  it("creates a session for a valid Plex token", async () => {
    vi.mocked(getPlexAccountFull).mockResolvedValue({
      id: 12345,
      username: "plexuser",
      email: "plex@test.com",
      thumb: "https://plex.tv/thumb.jpg",
    });

    const res = await request(app)
      .post("/auth/plex-login")
      .send({ authToken: "valid-plex-token" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("plexuser");
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.thumb).toBe("https://plex.tv/thumb.jpg");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("tunearr_session=");
  });

  it("returns 400 when authToken is missing", async () => {
    const res = await request(app).post("/auth/plex-login").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("authToken is required");
  });

  it("returns error when Plex token is invalid", async () => {
    vi.mocked(getPlexAccountFull).mockRejectedValue(
      new Error("Plex returned 401")
    );

    const res = await request(app)
      .post("/auth/plex-login")
      .send({ authToken: "invalid-token" });

    expect(res.status).toBe(500);
  });

  it("returns 403 for disabled Plex user", async () => {
    vi.mocked(getPlexAccountFull).mockResolvedValue({
      id: 12345,
      username: "plexuser",
      email: "plex@test.com",
      thumb: "https://plex.tv/thumb.jpg",
    });

    await request(app)
      .post("/auth/plex-login")
      .send({ authToken: "valid-plex-token" });

    getDb()
      .prepare("UPDATE users SET enabled = 0 WHERE plex_id = '12345'")
      .run();

    const res = await request(app)
      .post("/auth/plex-login")
      .send({ authToken: "valid-plex-token" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Account is disabled");
  });

  it("reuses existing Plex user on re-login", async () => {
    vi.mocked(getPlexAccountFull).mockResolvedValue({
      id: 12345,
      username: "plexuser",
      email: "plex@test.com",
      thumb: "https://plex.tv/thumb.jpg",
    });

    const first = await request(app)
      .post("/auth/plex-login")
      .send({ authToken: "valid-plex-token" });

    const second = await request(app)
      .post("/auth/plex-login")
      .send({ authToken: "valid-plex-token" });

    expect(first.body.user.id).toBe(second.body.user.id);
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
    expect(res.body.user.thumb).toBeNull();
  });

  it("returns user: null for invalid cookie", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Cookie", "tunearr_session=invalidtoken");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });
});

describe("GET /auth/app-status", () => {
  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/auth/app-status");
    expect(res.status).toBe(401);
  });

  it("returns lidarrConfigured: false when not configured", async () => {
    const setupRes = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });
    const cookie = setupRes.headers["set-cookie"][0];

    vi.mocked(getConfigValue).mockReturnValue("");

    const res = await request(app)
      .get("/auth/app-status")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lidarrConfigured: false });
  });

  it("returns lidarrConfigured: true when configured", async () => {
    const setupRes = await request(app)
      .post("/auth/setup")
      .send({ username: "admin", password: "password123" });
    const cookie = setupRes.headers["set-cookie"][0];

    vi.mocked(getConfigValue).mockReturnValue("http://lidarr:8686");

    const res = await request(app)
      .get("/auth/app-status")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lidarrConfigured: true });
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
