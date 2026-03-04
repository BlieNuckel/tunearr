import { describe, it, expect, afterEach } from "vitest";
import { createDataSource } from "./dataSource";
import type { DataSource } from "typeorm";

let ds: DataSource | null = null;

afterEach(async () => {
  if (ds?.isInitialized) {
    await ds.destroy();
  }
  ds = null;
});

async function initTestDb(): Promise<DataSource> {
  ds = createDataSource(":memory:");
  await ds.initialize();
  await ds.query("PRAGMA foreign_keys = ON");
  return ds;
}

describe("InitialSchema migration", () => {
  it("creates users table with correct columns", async () => {
    const db = await initTestDb();

    const columns = (await db.query(
      "PRAGMA table_info(users)"
    )) as { name: string }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "username",
      "password_hash",
      "plex_id",
      "plex_email",
      "plex_thumb",
      "role",
      "enabled",
      "created_at",
      "updated_at",
      "theme",
      "plex_username",
      "user_type",
    ]);
  });

  it("creates sessions table with correct columns", async () => {
    const db = await initTestDb();

    const columns = (await db.query(
      "PRAGMA table_info(sessions)"
    )) as { name: string }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "token",
      "user_id",
      "expires_at",
      "created_at",
    ]);
  });

  it("creates expected indexes", async () => {
    const db = await initTestDb();

    const indexes = (await db.query(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
    )) as { name: string }[];
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain("idx_sessions_token");
    expect(indexNames).toContain("idx_sessions_user_id");
    expect(indexNames).toContain("idx_sessions_expires_at");
    expect(indexNames).toContain("idx_users_plex_id");
  });
});

describe("constraint enforcement", () => {
  it("enforces role CHECK constraint", async () => {
    const db = await initTestDb();

    await expect(
      db.query(
        "INSERT INTO users (username, role) VALUES (?, ?)",
        ["test", "superadmin"]
      )
    ).rejects.toThrow();
  });

  it("enforces enabled CHECK constraint", async () => {
    const db = await initTestDb();

    await expect(
      db.query(
        "INSERT INTO users (username, enabled) VALUES (?, ?)",
        ["test", 2]
      )
    ).rejects.toThrow();
  });

  it("enforces username UNIQUE constraint", async () => {
    const db = await initTestDb();

    await db.query("INSERT INTO users (username) VALUES (?)", ["alice"]);

    await expect(
      db.query("INSERT INTO users (username) VALUES (?)", ["alice"])
    ).rejects.toThrow();
  });

  it("enforces foreign key on sessions.user_id", async () => {
    const db = await initTestDb();

    await expect(
      db.query(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        ["tok123", 999, "2099-01-01 00:00:00"]
      )
    ).rejects.toThrow();
  });

  it("cascades session deletion when user is deleted", async () => {
    const db = await initTestDb();

    await db.query("INSERT INTO users (username) VALUES (?)", ["alice"]);
    const users = await db.query(
      "SELECT id FROM users WHERE username = ?",
      ["alice"]
    );
    const userId = users[0].id;

    await db.query(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
      ["tok123", userId, "2099-01-01 00:00:00"]
    );

    await db.query("DELETE FROM users WHERE id = ?", [userId]);

    const sessions = await db.query(
      "SELECT * FROM sessions WHERE user_id = ?",
      [userId]
    );
    expect(sessions).toHaveLength(0);
  });

  it("applies default values for role, enabled, and timestamps", async () => {
    const db = await initTestDb();

    await db.query("INSERT INTO users (username) VALUES (?)", ["bob"]);
    const users = await db.query(
      "SELECT * FROM users WHERE username = ?",
      ["bob"]
    );
    const user = users[0];

    expect(user.role).toBe("user");
    expect(user.enabled).toBe(1);
    expect(user.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(user.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
