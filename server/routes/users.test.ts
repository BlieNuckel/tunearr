import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { initializeDatabase, getDb, closeDatabase } from "../db";
import authRouter from "./auth";
import usersRouter from "./users";
import { errorHandler } from "../middleware/errorHandler";

type SetupResult = {
  cookie: string;
  userId: number;
};

let app: express.Express;

async function setupAdmin(
  appInstance: express.Express,
  username = "admin",
  password = "password123"
): Promise<SetupResult> {
  const res = await request(appInstance)
    .post("/auth/setup")
    .send({ username, password });
  return {
    cookie: res.headers["set-cookie"][0],
    userId: res.body.user.id,
  };
}

function createPlexUser(role = "user", enabled = 1): number {
  const result = getDb()
    .prepare(
      `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, role, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run("plex-123", "plexuser", "plex@test.com", "https://thumb.jpg", role, enabled);
  return result.lastInsertRowid as number;
}

beforeEach(() => {
  initializeDatabase(":memory:");
  app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use(errorHandler);
});

afterEach(() => {
  closeDatabase();
});

describe("GET /users", () => {
  it("returns user list for admins", async () => {
    const { cookie } = await setupAdmin(app);
    createPlexUser();

    const res = await request(app).get("/users").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].username).toBe("admin");
    expect(res.body[1].username).toBe("plexuser");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    await setupAdmin(app);
    const plexUserId = createPlexUser();
    const { createSession } = await import("../auth/sessions");
    const token = createSession(plexUserId);

    const res = await request(app)
      .get("/users")
      .set("Cookie", `tunearr_session=${token}`);

    expect(res.status).toBe(403);
  });
});

describe("PATCH /users/:id/role", () => {
  it("updates a user role", async () => {
    const { cookie } = await setupAdmin(app);
    const plexUserId = createPlexUser();

    const res = await request(app)
      .patch(`/users/${plexUserId}/role`)
      .set("Cookie", cookie)
      .send({ role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 400 for invalid role", async () => {
    const { cookie } = await setupAdmin(app);
    const plexUserId = createPlexUser();

    const res = await request(app)
      .patch(`/users/${plexUserId}/role`)
      .set("Cookie", cookie)
      .send({ role: "superadmin" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when demoting the last admin", async () => {
    const { cookie, userId } = await setupAdmin(app);

    const res = await request(app)
      .patch(`/users/${userId}/role`)
      .set("Cookie", cookie)
      .send({ role: "user" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot demote the last admin");
  });

  it("returns 404 for non-existent user", async () => {
    const { cookie } = await setupAdmin(app);

    const res = await request(app)
      .patch("/users/999/role")
      .set("Cookie", cookie)
      .send({ role: "admin" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /users/:id/enabled", () => {
  it("disables a user", async () => {
    const { cookie } = await setupAdmin(app);
    const plexUserId = createPlexUser();

    const res = await request(app)
      .patch(`/users/${plexUserId}/enabled`)
      .set("Cookie", cookie)
      .send({ enabled: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 400 for non-boolean enabled", async () => {
    const { cookie } = await setupAdmin(app);
    const plexUserId = createPlexUser();

    const res = await request(app)
      .patch(`/users/${plexUserId}/enabled`)
      .set("Cookie", cookie)
      .send({ enabled: "yes" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when disabling the last admin", async () => {
    const { cookie, userId } = await setupAdmin(app);

    const res = await request(app)
      .patch(`/users/${userId}/enabled`)
      .set("Cookie", cookie)
      .send({ enabled: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot disable the last admin");
  });
});

describe("DELETE /users/:id", () => {
  it("deletes a user", async () => {
    const { cookie } = await setupAdmin(app);
    const plexUserId = createPlexUser();

    const res = await request(app)
      .delete(`/users/${plexUserId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("prevents self-deletion", async () => {
    const { cookie, userId } = await setupAdmin(app);

    const res = await request(app)
      .delete(`/users/${userId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot delete yourself");
  });

  it("returns 404 for non-existent user", async () => {
    const { cookie } = await setupAdmin(app);

    const res = await request(app)
      .delete("/users/999")
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });
});
