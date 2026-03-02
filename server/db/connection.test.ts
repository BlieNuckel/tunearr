import { describe, it, expect, afterEach, vi } from "vitest";
import Database from "better-sqlite3";

afterEach(() => {
  vi.resetModules();
});

async function loadConnection() {
  return (await import("./connection")) as typeof import("./connection");
}

describe("openDatabase", () => {
  it("creates an in-memory database with correct pragmas", async () => {
    const { openDatabase } = await loadConnection();
    const db = openDatabase(":memory:");

    try {
      const walMode = db.pragma("journal_mode", { simple: true });
      expect(walMode).toBe("memory");

      const busyTimeout = db.pragma("busy_timeout", { simple: true });
      expect(busyTimeout).toBe(5000);

      const foreignKeys = db.pragma("foreign_keys", { simple: true });
      expect(foreignKeys).toBe(1);
    } finally {
      db.close();
    }
  });

  it("enables WAL mode for file-based databases", async () => {
    const fs = await import("fs");
    const os = await import("os");
    const path = await import("path");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "db-test-"));
    const dbPath = path.join(tmpDir, "test.db");

    const { openDatabase } = await loadConnection();
    const db = openDatabase(dbPath);

    try {
      const walMode = db.pragma("journal_mode", { simple: true });
      expect(walMode).toBe("wal");
    } finally {
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("getDb", () => {
  it("throws when database is not initialized", async () => {
    const { getDb } = await loadConnection();

    expect(() => getDb()).toThrow(
      "Database not initialized. Call initializeDatabase() first.",
    );
  });

  it("returns the database instance after setDb", async () => {
    const { getDb, setDb } = await loadConnection();
    const db = new Database(":memory:");

    try {
      setDb(db);
      expect(getDb()).toBe(db);
    } finally {
      db.close();
    }
  });
});

describe("closeDatabase", () => {
  it("closes the database and nullifies the singleton", async () => {
    const { setDb, getDb, closeDatabase, openDatabase } =
      await loadConnection();
    const db = openDatabase(":memory:");
    setDb(db);

    expect(getDb()).toBe(db);
    closeDatabase();
    expect(() => getDb()).toThrow("Database not initialized");
  });

  it("is safe to call when no database is open", async () => {
    const { closeDatabase } = await loadConnection();

    expect(() => closeDatabase()).not.toThrow();
  });
});
