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

describe("createDataSource", () => {
  it("creates a DataSource configured for better-sqlite3", () => {
    ds = createDataSource(":memory:");
    expect(ds.options.type).toBe("better-sqlite3");
  });

  it("initializes and runs migrations on an in-memory database", async () => {
    ds = createDataSource(":memory:");
    await ds.initialize();

    const tables = await ds.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const tableNames = tables.map((t: { name: string }) => t.name);

    expect(tableNames).toContain("users");
    expect(tableNames).toContain("sessions");
  });

  it("enables WAL mode for file-based databases", async () => {
    const fs = await import("fs");
    const os = await import("os");
    const path = await import("path");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-test-"));
    const dbPath = path.join(tmpDir, "test.db");

    try {
      ds = createDataSource(dbPath);
      await ds.initialize();

      const result = await ds.query("PRAGMA journal_mode");
      expect(result[0].journal_mode).toBe("wal");
    } finally {
      if (ds?.isInitialized) await ds.destroy();
      ds = null;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
