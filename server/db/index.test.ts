import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
});

async function loadDb() {
  return (await import("./index")) as typeof import("./index");
}

describe("initializeDatabase", () => {
  it("initializes database and makes getDataSource work", async () => {
    const { initializeDatabase, getDataSource, closeDatabase } =
      await loadDb();

    try {
      await initializeDatabase(":memory:");
      const ds = getDataSource();

      const tables = await ds.query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      const tableNames = tables.map((t: { name: string }) => t.name);

      expect(tableNames).toContain("users");
      expect(tableNames).toContain("sessions");
    } finally {
      await closeDatabase();
    }
  });

  it("getDataSource throws before initialization", async () => {
    const { getDataSource } = await loadDb();

    expect(() => getDataSource()).toThrow(
      "Database not initialized. Call initializeDatabase() first."
    );
  });

  it("closeDatabase makes getDataSource throw again", async () => {
    const { initializeDatabase, getDataSource, closeDatabase } =
      await loadDb();

    await initializeDatabase(":memory:");
    expect(() => getDataSource()).not.toThrow();

    await closeDatabase();
    expect(() => getDataSource()).toThrow("Database not initialized");
  });

  it("database is fully functional after initialization", async () => {
    const { initializeDatabase, getDataSource, closeDatabase } =
      await loadDb();

    try {
      await initializeDatabase(":memory:");
      const ds = getDataSource();

      await ds.query(
        "INSERT INTO users (username, role) VALUES (?, ?)",
        ["testuser", "admin"]
      );

      const users = await ds.query(
        "SELECT * FROM users WHERE username = ?",
        ["testuser"]
      );

      expect(users[0].username).toBe("testuser");
      expect(users[0].role).toBe("admin");
    } finally {
      await closeDatabase();
    }
  });
});
