import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IConfig {
  lidarrUrl: string;
  lidarrApiKey: string;
}

const DEFAULT_CONFIG: IConfig = {
  lidarrUrl: "",
  lidarrApiKey: "",
};

const CONFIG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const config = {
  get: () => {
    try {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  },
  set: (config: IConfig) => {
    if (!fs.existsSync(CONFIG_DIR)) {
      console.log(`config directory missing. creating it in ${CONFIG_DIR}`);
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  },
};

export { config, IConfig };;
