import "reflect-metadata";
import type { DataSource } from "typeorm";
import { createLogger } from "../logger";
import { createDataSource } from "./dataSource";

const log = createLogger("Database");

let dataSource: DataSource | null = null;

export async function initializeDatabase(dbPath?: string): Promise<void> {
  log.info("Initializing database...");
  const ds = createDataSource(dbPath);
  await ds.initialize();

  const qr = ds.createQueryRunner();
  try {
    await qr.query("PRAGMA busy_timeout = 5000");
    await qr.query("PRAGMA foreign_keys = ON");
  } finally {
    await qr.release();
  }

  dataSource = ds;
  log.info("Database initialized successfully");
}

export function getDataSource(): DataSource {
  if (!dataSource) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return dataSource;
}

export async function closeDatabase(): Promise<void> {
  if (dataSource) {
    await dataSource.destroy();
    dataSource = null;
  }
}

export type { UserType } from "./entity/User";
export { User } from "./entity/User";
export { Session } from "./entity/Session";
export type { RequestStatus } from "./entity/Request";
export { Request } from "./entity/Request";
export { Config } from "./entity/Config";
