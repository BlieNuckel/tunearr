import path from "path";
import { fileURLToPath } from "url";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Session } from "./entity/Session";
import { Request } from "./entity/Request";
import { WantedItem } from "./entity/WantedItem";
import { Purchase } from "./entity/Purchase";
import { Config } from "./entity/Config";
import { InitialSchema1709000000000 } from "./migration/1_InitialSchema";
import { ConfigTable1710000000000 } from "./migration/2_ConfigTable";
import { WantedItems1711000000000 } from "./migration/3_WantedItems";
import { Purchases1712000000000 } from "./migration/4_Purchases";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDefaultDbPath(): string {
  const configDir =
    process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "..", "config");
  return path.join(configDir, "tunearr.db");
}

export function createDataSource(dbPath?: string): DataSource {
  const resolvedPath = dbPath ?? getDefaultDbPath();

  return new DataSource({
    type: "better-sqlite3",
    database: resolvedPath,
    entities: [User, Session, Request, WantedItem, Purchase, Config],
    migrations: [
      InitialSchema1709000000000,
      ConfigTable1710000000000,
      WantedItems1711000000000,
      Purchases1712000000000,
    ],
    synchronize: false,
    migrationsRun: true,
    enableWAL: true,
  });
}
