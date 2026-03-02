import { createLogger } from "../logger";
import { openDatabase, setDb } from "./connection";
import { runMigrations } from "./migrations";

const log = createLogger("Database");

export function initializeDatabase(dbPath?: string): void {
  log.info("Initializing database...");
  const db = openDatabase(dbPath);
  setDb(db);
  runMigrations(db);
  log.info("Database initialized successfully");
}

export { getDb, closeDatabase } from "./connection";
export type { DatabaseInstance, User, Session, UserRole, Migration } from "./types";
