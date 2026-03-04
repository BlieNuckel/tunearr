import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "../db";
import {
  createSession,
  validateSession,
  deleteSession,
  deleteUserSessions,
  cleanExpiredSessions,
} from "./sessions";

beforeEach(async () => {
  await initializeDatabase(":memory:");
  await getDataSource().query(
    `INSERT INTO users (username, password_hash, role, enabled)
     VALUES ('admin', 'hash', 'admin', 1)`
  );
});

afterEach(async () => {
  await closeDatabase();
});

describe("createSession", () => {
  it("returns a 64-char hex token", async () => {
    const token = await createSession(1);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("inserts a session row in the database", async () => {
    const token = await createSession(1);
    const rows = await getDataSource().query(
      "SELECT * FROM sessions WHERE token = ?",
      [token]
    );
    expect(rows[0]).toBeDefined();
    expect(rows[0].user_id).toBe(1);
  });
});

describe("validateSession", () => {
  it("returns the user for a valid session", async () => {
    const token = await createSession(1);
    const user = await validateSession(token);
    expect(user).not.toBeNull();
    expect(user!.id).toBe(1);
    expect(user!.username).toBe("admin");
    expect(user!.userType).toBe("local");
    expect(user!.role).toBe("admin");
    expect(user!.enabled).toBe(true);
    expect(user!.theme).toBe("system");
    expect(user!.thumb).toBeNull();
  });

  it("returns null for a non-existent token", async () => {
    expect(await validateSession("nonexistent")).toBeNull();
  });

  it("returns null and deletes an expired session", async () => {
    const token = await createSession(1);
    await getDataSource().query(
      "UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE token = ?",
      [token]
    );

    expect(await validateSession(token)).toBeNull();

    const rows = await getDataSource().query(
      "SELECT * FROM sessions WHERE token = ?",
      [token]
    );
    expect(rows).toHaveLength(0);
  });

  it("returns null for a disabled user", async () => {
    await getDataSource().query(
      "UPDATE users SET enabled = 0 WHERE id = 1"
    );
    const token = await createSession(1);
    expect(await validateSession(token)).toBeNull();
  });

  it("includes user theme in the result", async () => {
    await getDataSource().query(
      "UPDATE users SET theme = 'dark' WHERE id = 1"
    );
    const token = await createSession(1);
    const user = await validateSession(token);
    expect(user!.theme).toBe("dark");
  });

  it("returns plex_username when username is null", async () => {
    await getDataSource().query(
      `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, user_type, role, enabled)
       VALUES ('plex-1', 'plexuser', 'plex@test.com', 'https://thumb.jpg', 'plex', 'user', 1)`
    );

    const users = await getDataSource().query(
      "SELECT id FROM users WHERE plex_id = 'plex-1'"
    );
    const token = await createSession(users[0].id);
    const user = await validateSession(token);
    expect(user).not.toBeNull();
    expect(user!.username).toBe("plexuser");
    expect(user!.userType).toBe("plex");
    expect(user!.thumb).toBe("https://thumb.jpg");
  });
});

describe("deleteSession", () => {
  it("removes the session from the database", async () => {
    const token = await createSession(1);
    await deleteSession(token);
    const rows = await getDataSource().query(
      "SELECT * FROM sessions WHERE token = ?",
      [token]
    );
    expect(rows).toHaveLength(0);
  });
});

describe("deleteUserSessions", () => {
  it("removes all sessions for a user", async () => {
    await createSession(1);
    await createSession(1);
    await deleteUserSessions(1);
    const rows = await getDataSource().query(
      "SELECT COUNT(*) as count FROM sessions WHERE user_id = 1"
    );
    expect(rows[0].count).toBe(0);
  });
});

describe("cleanExpiredSessions", () => {
  it("removes expired sessions but keeps valid ones", async () => {
    const validToken = await createSession(1);
    const expiredToken = await createSession(1);
    await getDataSource().query(
      "UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE token = ?",
      [expiredToken]
    );

    await cleanExpiredSessions();

    const validRows = await getDataSource().query(
      "SELECT * FROM sessions WHERE token = ?",
      [validToken]
    );
    expect(validRows).toHaveLength(1);

    const expiredRows = await getDataSource().query(
      "SELECT * FROM sessions WHERE token = ?",
      [expiredToken]
    );
    expect(expiredRows).toHaveLength(0);
  });
});
