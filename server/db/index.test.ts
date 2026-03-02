import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
});

async function loadDb() {
  return (await import("./index")) as typeof import("./index");
}

describe("initializeDatabase", () => {
  it("initializes database, runs migrations, and makes getDb work", async () => {
    const { initializeDatabase, getDb, closeDatabase } = await loadDb();

    try {
      initializeDatabase(":memory:");
      const db = getDb();

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain("users");
      expect(tableNames).toContain("sessions");
      expect(tableNames).toContain("_migrations");
    } finally {
      closeDatabase();
    }
  });

  it("getDb throws before initialization", async () => {
    const { getDb } = await loadDb();

    expect(() => getDb()).toThrow("Database not initialized");
  });

  it("closeDatabase makes getDb throw again", async () => {
    const { initializeDatabase, getDb, closeDatabase } = await loadDb();

    initializeDatabase(":memory:");
    expect(() => getDb()).not.toThrow();

    closeDatabase();
    expect(() => getDb()).toThrow("Database not initialized");
  });

  it("database is fully functional after initialization", async () => {
    const { initializeDatabase, getDb, closeDatabase } = await loadDb();

    try {
      initializeDatabase(":memory:");
      const db = getDb();

      db.prepare("INSERT INTO users (username, role) VALUES (?, ?)").run(
        "testuser",
        "admin",
      );

      const user = db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get("testuser") as { username: string; role: string };

      expect(user.username).toBe("testuser");
      expect(user.role).toBe("admin");
    } finally {
      closeDatabase();
    }
  });
});
