import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "../logger";
import type { DatabaseInstance } from "./types";

const log = createLogger("Migrations");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

type MigrationFile = {
  version: number;
  name: string;
  path: string;
};

function ensureMigrationsTable(db: DatabaseInstance): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function getAppliedVersions(db: DatabaseInstance): Set<number> {
  const rows = db
    .prepare("SELECT version FROM _migrations ORDER BY version")
    .all() as { version: number }[];
  return new Set(rows.map((r) => r.version));
}

function discoverMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"));
  const migrations: MigrationFile[] = [];

  for (const file of files) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) continue;

    migrations.push({
      version: parseInt(match[1], 10),
      name: match[2],
      path: path.join(MIGRATIONS_DIR, file),
    });
  }

  return migrations.sort((a, b) => a.version - b.version);
}

export function runMigrations(db: DatabaseInstance): void {
  ensureMigrationsTable(db);

  const applied = getAppliedVersions(db);
  const available = discoverMigrationFiles();
  const pending = available.filter((m) => !applied.has(m.version));

  if (pending.length === 0) {
    log.info("Database schema is up to date");
    return;
  }

  for (const migration of pending) {
    log.info(`Applying migration ${migration.version}: ${migration.name}`);
    const sql = fs.readFileSync(migration.path, "utf-8");

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (version, name) VALUES (?, ?)").run(
        migration.version,
        migration.name
      );
    });

    applyMigration();
    log.info(`Migration ${migration.version} applied successfully`);
  }
}
