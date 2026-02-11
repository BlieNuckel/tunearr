import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

export interface Config {
  lidarrUrl: string;
  lidarrApiKey: string;
}

const DEFAULT_CONFIG: Config = {
  lidarrUrl: "",
  lidarrApiKey: "",
};

export const loadConfig = (): Config => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};

export const saveConfig = (config: Config): void => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};
