import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDb, closeDatabase } from "../db";
import {
  createSession,
  validateSession,
  deleteSession,
  deleteUserSessions,
  cleanExpiredSessions,
} from "./sessions";

beforeEach(() => {
  initializeDatabase(":memory:");
  getDb()
    .prepare(
      `INSERT INTO users (username, password_hash, role, enabled)
       VALUES ('admin', 'hash', 'admin', 1)`
    )
    .run();
});

afterEach(() => {
  closeDatabase();
});

describe("createSession", () => {
  it("returns a 64-char hex token", () => {
    const token = createSession(1);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("inserts a session row in the database", () => {
    const token = createSession(1);
    const row = getDb()
      .prepare("SELECT * FROM sessions WHERE token = ?")
      .get(token) as { token: string; user_id: number };
    expect(row).toBeDefined();
    expect(row.user_id).toBe(1);
  });
});

describe("validateSession", () => {
  it("returns the user for a valid session", () => {
    const token = createSession(1);
    const user = validateSession(token);
    expect(user).not.toBeNull();
    expect(user!.id).toBe(1);
    expect(user!.username).toBe("admin");
    expect(user!.role).toBe("admin");
    expect(user!.enabled).toBe(true);
    expect(user!.theme).toBe("system");
  });

  it("returns null for a non-existent token", () => {
    expect(validateSession("nonexistent")).toBeNull();
  });

  it("returns null and deletes an expired session", () => {
    const token = createSession(1);
    getDb()
      .prepare(
        "UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE token = ?"
      )
      .run(token);

    expect(validateSession(token)).toBeNull();

    const row = getDb()
      .prepare("SELECT * FROM sessions WHERE token = ?")
      .get(token);
    expect(row).toBeUndefined();
  });

  it("returns null for a disabled user", () => {
    getDb().prepare("UPDATE users SET enabled = 0 WHERE id = 1").run();
    const token = createSession(1);
    expect(validateSession(token)).toBeNull();
  });

  it("includes user theme in the result", () => {
    getDb().prepare("UPDATE users SET theme = 'dark' WHERE id = 1").run();
    const token = createSession(1);
    const user = validateSession(token);
    expect(user!.theme).toBe("dark");
  });
});

describe("deleteSession", () => {
  it("removes the session from the database", () => {
    const token = createSession(1);
    deleteSession(token);
    const row = getDb()
      .prepare("SELECT * FROM sessions WHERE token = ?")
      .get(token);
    expect(row).toBeUndefined();
  });
});

describe("deleteUserSessions", () => {
  it("removes all sessions for a user", () => {
    createSession(1);
    createSession(1);
    deleteUserSessions(1);
    const count = getDb()
      .prepare("SELECT COUNT(*) as count FROM sessions WHERE user_id = 1")
      .get() as { count: number };
    expect(count.count).toBe(0);
  });
});

describe("cleanExpiredSessions", () => {
  it("removes expired sessions but keeps valid ones", () => {
    const validToken = createSession(1);
    const expiredToken = createSession(1);
    getDb()
      .prepare(
        "UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE token = ?"
      )
      .run(expiredToken);

    cleanExpiredSessions();

    expect(
      getDb().prepare("SELECT * FROM sessions WHERE token = ?").get(validToken)
    ).toBeDefined();
    expect(
      getDb()
        .prepare("SELECT * FROM sessions WHERE token = ?")
        .get(expiredToken)
    ).toBeUndefined();
  });
});
