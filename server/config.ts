import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IConfig {
  lidarrUrl?: string;
  lidarrApiKey?: string;
  lidarrQualityProfileId?: number;
  lidarrRootFolderPath?: string;
  lidarrMetadataProfileId?: number;
}

const DEFAULT_CONFIG: IConfig = {};

const CONFIG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const getConfig = (): IConfig => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};

const config = {
  get: (key: keyof IConfig) => {
    return getConfig()[key];
  },
  set: <T extends keyof IConfig>(key: T, value: IConfig[T]) => {
    if (!fs.existsSync(CONFIG_DIR)) {
      console.log(`config directory missing. creating it in ${CONFIG_DIR}`);
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const currentConfig = getConfig();
    const newConfig = { ...currentConfig, [key]: value };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
  },
};

export { config, IConfig };
