import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import type { DatabaseInstance } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: DatabaseInstance | null = null;

function getDefaultDbPath(): string {
  const configDir =
    process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "..", "config");
  return path.join(configDir, "tunearr.db");
}

export function openDatabase(dbPath?: string): DatabaseInstance {
  const resolvedPath = dbPath ?? getDefaultDbPath();
  const instance = new Database(resolvedPath);

  instance.pragma("journal_mode = WAL");
  instance.pragma("busy_timeout = 5000");
  instance.pragma("foreign_keys = ON");

  return instance;
}

export function getDb(): DatabaseInstance {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  }
  return db;
}

export function setDb(instance: DatabaseInstance): void {
  db = instance;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
