import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import type { DatabaseInstance } from "./types";

let db: DatabaseInstance;

afterEach(() => {
  if (db?.open) {
    db.close();
  }
});

async function loadMigrations() {
  return (await import("./migrations")) as typeof import("./migrations");
}

function createTestDb(): DatabaseInstance {
  const instance = new Database(":memory:");
  instance.pragma("foreign_keys = ON");
  return instance;
}

describe("runMigrations", () => {
  it("creates _migrations table and applies all migrations", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();

    runMigrations(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("_migrations");
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("sessions");
  });

  it("is idempotent — running twice does not fail", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();

    runMigrations(db);
    runMigrations(db);

    const migrations = db
      .prepare("SELECT * FROM _migrations")
      .all() as { version: number; name: string }[];
    expect(migrations).toHaveLength(3);
    expect(migrations[0].version).toBe(1);
    expect(migrations[0].name).toBe("initial");
    expect(migrations[1].version).toBe(2);
    expect(migrations[1].name).toBe("user_preferences");
    expect(migrations[2].version).toBe(3);
    expect(migrations[2].name).toBe("plex_username");
  });

  it("tracks migration versions correctly", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();

    runMigrations(db);

    const migrations = db
      .prepare("SELECT version, name FROM _migrations ORDER BY version")
      .all() as { version: number; name: string }[];

    expect(migrations).toEqual([
      { version: 1, name: "initial" },
      { version: 2, name: "user_preferences" },
      { version: 3, name: "plex_username" },
    ]);
  });
});

describe("schema validation", () => {
  it("creates users table with correct columns", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    const columns = db.prepare("PRAGMA table_info(users)").all() as {
      name: string;
      type: string;
      notnull: number;
    }[];
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
    ]);
  });

  it("creates sessions table with correct columns", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    const columns = db.prepare("PRAGMA table_info(sessions)").all() as {
      name: string;
    }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "token",
      "user_id",
      "expires_at",
      "created_at",
    ]);
  });

  it("creates expected indexes on sessions and users", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
      )
      .all() as { name: string }[];
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain("idx_sessions_token");
    expect(indexNames).toContain("idx_sessions_user_id");
    expect(indexNames).toContain("idx_sessions_expires_at");
    expect(indexNames).toContain("idx_users_plex_id");
  });
});

describe("constraint enforcement", () => {
  it("enforces role CHECK constraint", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    expect(() =>
      db
        .prepare("INSERT INTO users (username, role) VALUES (?, ?)")
        .run("test", "superadmin")
    ).toThrow();
  });

  it("enforces enabled CHECK constraint", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    expect(() =>
      db
        .prepare("INSERT INTO users (username, enabled) VALUES (?, ?)")
        .run("test", 2)
    ).toThrow();
  });

  it("enforces username UNIQUE constraint", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    db.prepare("INSERT INTO users (username) VALUES (?)").run("alice");

    expect(() =>
      db.prepare("INSERT INTO users (username) VALUES (?)").run("alice")
    ).toThrow();
  });

  it("enforces foreign key on sessions.user_id", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    expect(() =>
      db
        .prepare(
          "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
        )
        .run("tok123", 999, "2099-01-01 00:00:00")
    ).toThrow();
  });

  it("cascades session deletion when user is deleted", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    db.prepare("INSERT INTO users (username) VALUES (?)").run("alice");
    const user = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get("alice") as { id: number };

    db.prepare(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
    ).run("tok123", user.id, "2099-01-01 00:00:00");

    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

    const sessions = db
      .prepare("SELECT * FROM sessions WHERE user_id = ?")
      .all(user.id);
    expect(sessions).toHaveLength(0);
  });

  it("applies default values for role, enabled, and timestamps", async () => {
    db = createTestDb();
    const { runMigrations } = await loadMigrations();
    runMigrations(db);

    db.prepare("INSERT INTO users (username) VALUES (?)").run("bob");
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get("bob") as {
      role: string;
      enabled: number;
      created_at: string;
      updated_at: string;
    };

    expect(user.role).toBe("user");
    expect(user.enabled).toBe(1);
    expect(user.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(user.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
